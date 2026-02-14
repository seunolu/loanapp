import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { BORROWER_ACCESS_TOKEN_COOKIE, BORROWER_REFRESH_TOKEN_COOKIE } from '@/lib/api/constants';

const REFRESH_ATTEMPT_HEADER = 'x-borrower-refresh-attempt';
const PROTECTED_SEGMENTS = new Set(['profile', 'apply', 'offer', 'loan', 'repay']);

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return true;
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized)) as { exp?: number };
    if (!decoded.exp) {
      return true;
    }
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function isProtectedBorrowerPath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 3 || parts[0] !== 'l') {
    return false;
  }
  const segment = parts[2] ?? '';
  return PROTECTED_SEGMENTS.has(segment);
}

function loginUrlFor(pathname: string, requestUrl: string): URL {
  const parts = pathname.split('/').filter(Boolean);
  const slug = parts[1] ?? '';
  const loginPath = slug ? `/l/${slug}/login` : '/';
  const loginUrl = new URL(loginPath, requestUrl);
  loginUrl.searchParams.set('next', pathname);
  return loginUrl;
}

async function tryRefresh(request: NextRequest): Promise<NextResponse | null> {
  const refreshUrl = new URL('/api/auth/refresh', request.url);
  const response = await fetch(refreshUrl, {
    method: 'POST',
    headers: {
      cookie: request.headers.get('cookie') ?? '',
      [REFRESH_ATTEMPT_HEADER]: '1',
      'x-request-id': crypto.randomUUID()
    }
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const next = NextResponse.next();
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = typeof getSetCookie === 'function' ? getSetCookie.call(response.headers) : [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      next.headers.append('set-cookie', cookie);
    }
    return next;
  }

  const fallbackSetCookie = response.headers.get('set-cookie');
  if (fallbackSetCookie) {
    next.headers.append('set-cookie', fallbackSetCookie);
  }
  return next;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/proxy') ||
    pathname.startsWith('/favicon') ||
    !isProtectedBorrowerPath(pathname)
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(BORROWER_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const refreshToken = request.cookies.get(BORROWER_REFRESH_TOKEN_COOKIE)?.value ?? '';
  const accessValid = Boolean(accessToken) && !isTokenExpired(accessToken);
  if (accessValid) {
    return NextResponse.next();
  }

  const attemptedRefresh = request.headers.get(REFRESH_ATTEMPT_HEADER) === '1';
  if (refreshToken && !attemptedRefresh) {
    const refreshed = await tryRefresh(request);
    if (refreshed) {
      return refreshed;
    }
  }

  return NextResponse.redirect(loginUrlFor(pathname, request.url));
}

export const config = {
  matcher: ['/((?!.*\\..*).*)']
};
