import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/api/constants';

const PUBLIC_PATHS = ['/login', '/setup-password'];
const REFRESH_ATTEMPT_HEADER = 'x-auth-refresh-attempt';

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

async function tryRefresh(request: NextRequest): Promise<NextResponse | null> {
  const refreshUrl = new URL('/api/auth/refresh', request.url);
  const refreshResponse = await fetch(refreshUrl, {
    method: 'POST',
    headers: {
      cookie: request.headers.get('cookie') ?? '',
      [REFRESH_ATTEMPT_HEADER]: '1',
      'x-request-id': crypto.randomUUID()
    }
  }).catch(() => null);

  if (!refreshResponse || !refreshResponse.ok) {
    return null;
  }

  const next = NextResponse.next();
  const getSetCookie = (refreshResponse.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = typeof getSetCookie === 'function' ? getSetCookie.call(refreshResponse.headers) : [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      next.headers.append('set-cookie', cookie);
    }
    return next;
  }

  const fallbackSetCookie = refreshResponse.headers.get('set-cookie');
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
    pathname.startsWith('/favicon') ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? '';
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? '';
  const attemptedRefresh = request.headers.get(REFRESH_ATTEMPT_HEADER) === '1';
  const accessValid = Boolean(accessToken) && !isTokenExpired(accessToken);
  if (accessValid) {
    return NextResponse.next();
  }

  if (refreshToken && !attemptedRefresh) {
    const refreshed = await tryRefresh(request);
    if (refreshed) {
      return refreshed;
    }
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!.*\\..*).*)']
};
