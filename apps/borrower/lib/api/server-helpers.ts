import { cookies } from 'next/headers';

import { BORROWER_ACCESS_TOKEN_COOKIE, BORROWER_REFRESH_TOKEN_COOKIE } from '@/lib/api/constants';

export function getApiV1BaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/+$/, '')}/api/v1`;
}

export function getBackendUrl(path: string): string {
  return `${getApiV1BaseUrl()}${path}`;
}

export function getRequestIdFromHeaders(headers: Headers): string {
  return headers.get('x-request-id') ?? crypto.randomUUID();
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/'
  };
}

export function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = cookies();
  cookieStore.set(BORROWER_ACCESS_TOKEN_COOKIE, accessToken, authCookieOptions());
  cookieStore.set(BORROWER_REFRESH_TOKEN_COOKIE, refreshToken, authCookieOptions());
}

export function clearAuthCookies() {
  const cookieStore = cookies();
  cookieStore.delete(BORROWER_ACCESS_TOKEN_COOKIE);
  cookieStore.delete(BORROWER_REFRESH_TOKEN_COOKIE);
}

export function readAccessToken(): string | null {
  return cookies().get(BORROWER_ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export function readRefreshToken(): string | null {
  return cookies().get(BORROWER_REFRESH_TOKEN_COOKIE)?.value ?? null;
}
