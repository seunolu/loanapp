import { cookies } from 'next/headers';

import { getApiV1BaseUrl } from '@/lib/api/config';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/api/constants';

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
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, authCookieOptions());
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, authCookieOptions());
}

export function clearAuthCookies() {
  const cookieStore = cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export function readAccessToken(): string | null {
  return cookies().get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export function readRefreshToken(): string | null {
  return cookies().get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}
