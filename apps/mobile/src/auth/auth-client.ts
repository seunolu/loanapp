import { getOrCreateDeviceId } from '../lib/device';
import { getApiBaseUrl } from '../lib/apiBaseUrl';
import { clearTenantSlug, getTenantSlug } from '../lib/storage';
import { AuthError, NetworkError } from '../errors/AppError';
import { refreshSessionTokens } from './auth-service';
import { emitSessionExpired } from './session-events';
import { clearTokenTenantBinding, clearTokens, getTokenTenantBinding, getTokens, setTokenTenantBinding, type SessionTokens } from './token-storage';
import { getClientContext } from '../security/device-context';
import { activateMaintenanceMode, isMaintenanceError } from '../security/maintenance';
import { safeErrorMessage } from '../security/redaction';
import { secureFetch } from '../security/secure-fetch';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type AuthRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  retryOnUnauthorized?: boolean;
};

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
  code?: string;
  message?: string;
};

const API_V1 = `${getApiBaseUrl()}/api/v1`;
let refreshPromise: Promise<SessionTokens | null> | null = null;

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function asErrorPayload(payload: unknown): ErrorPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return payload as ErrorPayload;
}

function parseBody(responseText: string): unknown {
  if (!responseText) {
    return undefined;
  }
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

function getErrorMessage(status: number, payload: unknown): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }
  const parsed = asErrorPayload(payload);
  const message = parsed?.error?.message ?? parsed?.message;
  return safeErrorMessage(message ?? `Request failed (${status})`);
}

function hasTokenExpiredError(payload: unknown): boolean {
  const parsed = asErrorPayload(payload);
  const code = parsed?.error?.code ?? parsed?.code ?? '';
  return code === 'TOKEN_EXPIRED';
}

function isUnauthorizedStatus(status: number): boolean {
  return status === 401 || status === 403;
}

async function expireSession(message = 'Session expired. Please log in again.'): Promise<never> {
  await Promise.all([clearTokens(), clearTokenTenantBinding(), clearTenantSlug()]);
  emitSessionExpired();
  throw new AuthError(message);
}

async function refreshTokensSingleFlight(): Promise<SessionTokens | null> {
  if (!refreshPromise) {
    refreshPromise = refreshSessionTokens().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function buildHeaders(inputHeaders: Record<string, string> | undefined, requiresAuth: boolean): Promise<Headers> {
  const headers = new Headers(inputHeaders ?? {});
  const context = getClientContext();
  const deviceId = await getOrCreateDeviceId();
  headers.set('X-Request-Id', requestId());
  headers.set('X-Device-Id', deviceId);
  headers.set('x-device-id', deviceId);
  headers.set('x-app-version', context.appVersion);
  headers.set('x-platform', context.platform);

  const tenantSlug = (await getTenantSlug())?.trim().toLowerCase() ?? '';
  if (tenantSlug && !headers.has('x-tenant-slug')) {
    headers.set('x-tenant-slug', tenantSlug);
  }

  if (requiresAuth) {
    const tokens = await getTokens();
    if (!tokens?.accessToken) {
      await expireSession();
    }
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      await expireSession();
    }
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

async function enforceTenantBinding(requiresAuth: boolean): Promise<void> {
  if (!requiresAuth) {
    return;
  }
  const currentTenant = (await getTenantSlug())?.trim().toLowerCase() ?? '';
  if (!currentTenant) {
    return;
  }
  const boundTenant = (await getTokenTenantBinding())?.trim().toLowerCase() ?? '';
  if (!boundTenant) {
    await setTokenTenantBinding(currentTenant);
    return;
  }
  if (boundTenant !== currentTenant) {
    await expireSession('Session mismatch detected. Please sign in again.');
  }
}

export async function authRequest<T>(path: string, options: AuthRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const requiresAuth = options.requiresAuth ?? false;
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  await enforceTenantBinding(requiresAuth);
  const headers = await buildHeaders(options.headers, requiresAuth);

  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await secureFetch(`${API_V1}${path}`, {
      method,
      headers,
      body
    }, { retryIdempotentGet: method === 'GET' });
  } catch (error: unknown) {
    throw new NetworkError(safeErrorMessage(error, 'Network request failed.'), undefined, error);
  }

  const responseText = await response.text();
  const payload = parseBody(responseText);

  if (isMaintenanceError(response.status, payload)) {
    activateMaintenanceMode();
    throw new NetworkError('Service temporarily unavailable. Try again.', response.status, payload);
  }

  if ((isUnauthorizedStatus(response.status) || hasTokenExpiredError(payload)) && requiresAuth && retryOnUnauthorized) {
    const refreshed = await refreshTokensSingleFlight();
    if (!refreshed?.accessToken) {
      await expireSession();
    }
    return authRequest<T>(path, { ...options, retryOnUnauthorized: false });
  }

  if (!response.ok) {
    const message = getErrorMessage(response.status, payload);
    if (isUnauthorizedStatus(response.status) && requiresAuth) {
      await expireSession(message);
    }
    if (isUnauthorizedStatus(response.status)) {
      throw new AuthError(message, payload);
    }
    throw new NetworkError(message, response.status, payload);
  }

  if (!responseText) {
    return undefined as T;
  }

  return payload as T;
}
