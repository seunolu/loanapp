import { getRequestId } from '@/lib/api/request-id';

async function parseOrThrow(response: Response): Promise<unknown> {
  if (response.ok) {
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }

  const payload = await response.json().catch(() => null);
  const message =
    (payload as { error?: { message?: string } } | null)?.error?.message ?? 'Request failed.';
  throw new Error(message);
}

async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers ?? {});
  headers.set('X-Request-Id', getRequestId());
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers
  });
  return parseOrThrow(response);
}

export async function proxyRequest(path: string, init?: RequestInit): Promise<unknown> {
  return apiRequest(`/api/proxy/${path.replace(/^\/+/, '')}`, init);
}

export async function loginRequest(email: string, password: string): Promise<void> {
  await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function setupPasswordRequest(token: string, newPassword: string): Promise<void> {
  await apiRequest('/api/auth/setup-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword })
  });
}

export async function logoutRequest(): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST' });
}

export async function getSessionRequest(): Promise<unknown> {
  return apiRequest('/api/proxy/admin/me', { method: 'GET' });
}

export async function getDashboardSummaryRequest(): Promise<unknown> {
  return apiRequest('/api/proxy/admin/reports/summary', { method: 'GET' });
}
