import { getOrCreateDeviceId } from './device';
import {
  clearSessionTokens,
  getSessionTokens,
  getTenantSlug,
  setSessionTokens,
  setTenantSlug,
  type SessionTokens
} from './storage';

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:3000').replace(/\/+$/, '');
const API_V1 = `${API_BASE}/api/v1`;

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
  };
};

export type TenantPublicConfig = {
  lenderId: string;
  lenderSlug: string;
  branding: {
    displayName: string;
    logoUrl: string | null;
    primaryColor: string;
  };
  policy: {
    minLoanAmountKobo: number;
    maxLoanAmountKobo: number;
    minTenorDays: number;
    maxTenorDays: number;
  };
  support: {
    phone: string | null;
    email: string | null;
    whatsapp: string | null;
  };
  features: {
    maintenanceMode: boolean;
    enableOtpSms: boolean;
  };
};

export type BorrowerMe = {
  id: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  profile: null | {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
  };
  kycStatus: string;
};

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  retryOnUnauthorized?: boolean;
};

let refreshPromise: Promise<SessionTokens | null> | null = null;

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

async function parseJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null;
}

async function refreshTokensSingleFlight(): Promise<SessionTokens | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const tokens = await getSessionTokens();
      if (!tokens?.refreshToken) {
        return null;
      }

      const refreshed = await fetch(`${API_V1}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId(),
          'X-Device-Id': await getOrCreateDeviceId()
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken })
      });

      if (!refreshed.ok) {
        await clearSessionTokens();
        return null;
      }

      const payload = await parseJson<{ accessToken?: string; refreshToken?: string }>(refreshed);
      if (!payload?.accessToken || !payload.refreshToken) {
        await clearSessionTokens();
        return null;
      }

      const nextTokens = { accessToken: payload.accessToken, refreshToken: payload.refreshToken };
      await setSessionTokens(nextTokens);
      return nextTokens;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const requiresAuth = options.requiresAuth ?? false;
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  const deviceId = await getOrCreateDeviceId();

  const headers = new Headers(options.headers ?? {});
  headers.set('X-Request-Id', requestId());
  headers.set('X-Device-Id', deviceId);

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let accessToken = '';
  if (requiresAuth) {
    const tokens = await getSessionTokens();
    accessToken = tokens?.accessToken ?? '';
    if (!accessToken) {
      throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_V1}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 401 && requiresAuth && retryOnUnauthorized) {
    const refreshed = await refreshTokensSingleFlight();
    if (!refreshed?.accessToken) {
      throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
  }

  if (!response.ok) {
    const payload = await parseJson<ApiErrorPayload>(response);
    throw new ApiError(payload?.error?.message ?? `Request failed (${response.status})`, response.status, payload?.error?.code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function loadTenantConfig(slug: string): Promise<TenantPublicConfig> {
  const response = await apiRequest<TenantPublicConfig>(`/public/config/by-slug?slug=${encodeURIComponent(slug)}`);
  await setTenantSlug(slug);
  return response;
}

export async function getSelectedTenantConfig(): Promise<TenantPublicConfig> {
  const slug = await getTenantSlug();
  if (!slug) {
    throw new ApiError('Select a tenant first.', 400, 'TENANT_REQUIRED');
  }
  return loadTenantConfig(slug);
}

export async function requestOtp(phone: string): Promise<{ otpRef: string; expiresInSec: number }> {
  const tenant = await getSelectedTenantConfig();
  return apiRequest<{ otpRef: string; expiresInSec: number }>('/auth/request-otp', {
    method: 'POST',
    headers: {
      'X-Lender-Id': tenant.lenderId
    },
    body: { phone },
    requiresAuth: false
  });
}

export async function verifyOtp(input: {
  phone: string;
  otpRef: string;
  otp: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const tenant = await getSelectedTenantConfig();
  const deviceId = await getOrCreateDeviceId();
  const response = await apiRequest<{
    accessToken: string;
    refreshToken: string;
  }>('/auth/verify-otp', {
    method: 'POST',
    headers: {
      'X-Lender-Id': tenant.lenderId
    },
    body: {
      phone: input.phone,
      otpRef: input.otpRef,
      otp: input.otp,
      deviceId,
      deviceName: 'LoanApp Mobile',
      platform: 'android'
    }
  });

  await setSessionTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken
  });
  return response;
}

export async function logout(): Promise<void> {
  const tokens = await getSessionTokens();
  if (tokens?.refreshToken) {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken: tokens.refreshToken },
      requiresAuth: false
    }).catch(() => undefined);
  }
  await clearSessionTokens();
}

export async function getMe(): Promise<BorrowerMe> {
  return apiRequest<BorrowerMe>('/me', { requiresAuth: true });
}

export async function hasActiveSession(): Promise<boolean> {
  const tokens = await getSessionTokens();
  return Boolean(tokens?.accessToken && tokens.refreshToken);
}
