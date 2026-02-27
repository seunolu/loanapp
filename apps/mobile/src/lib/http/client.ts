import { AuthError, NetworkError } from '../../errors/AppError';
import { getSessionTokens } from '../storage';
import { secureFetch } from '../../security/secure-fetch';
import { activateMaintenanceMode, isMaintenanceError } from '../../security/maintenance';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  headers?: Record<string, string>;
  body?: BodyInit | object;
};

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string' ||
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof URLSearchParams ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  );
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }
  const raw = await response.text();
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function resolveMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: string; error?: { message?: string } }).error?.message ??
      (payload as { message?: string }).message;
    if (message) {
      return message;
    }
  }
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }
  return `Request failed (${status})`;
}

export async function request<T>(method: HttpMethod, url: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  const tokens = await getSessionTokens();
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (isBodyInit(options.body)) {
      body = options.body;
    } else {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(options.body);
    }
  }

  let response: Response;
  try {
    response = await secureFetch(url, { method, headers, body }, { retryIdempotentGet: method === 'GET' });
  } catch (error: unknown) {
    throw new NetworkError('Network request failed.', undefined, error);
  }

  const parsed = await readResponseBody(response);
  if (isMaintenanceError(response.status, parsed)) {
    activateMaintenanceMode();
    throw new NetworkError('Service temporarily unavailable. Try again.', response.status, parsed);
  }
  if (!response.ok) {
    const message = resolveMessage(response.status, parsed);
    if (response.status === 401) {
      throw new AuthError(message, parsed);
    }
    throw new NetworkError(message, response.status, parsed);
  }

  return parsed as T;
}
