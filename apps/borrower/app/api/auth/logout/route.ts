import { NextResponse } from 'next/server';

import { clearAuthCookies, getBackendUrl, getRequestIdFromHeaders, readRefreshToken } from '@/lib/api/server-helpers';

export async function POST(request: Request) {
  const refreshToken = readRefreshToken();
  const requestId = getRequestIdFromHeaders(request.headers);

  if (refreshToken) {
    await fetch(getBackendUrl('/auth/logout'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store'
    }).catch(() => null);
  }

  clearAuthCookies();
  const okResponse = NextResponse.json({ ok: true });
  okResponse.headers.set('X-Request-Id', requestId);
  return okResponse;
}
