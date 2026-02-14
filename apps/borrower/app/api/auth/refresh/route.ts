import { NextResponse } from 'next/server';

import { getBackendUrl, getRequestIdFromHeaders, readRefreshToken, setAuthCookies } from '@/lib/api/server-helpers';

export async function POST(request: Request) {
  const refreshToken = readRefreshToken();
  const requestId = getRequestIdFromHeaders(request.headers);

  if (!refreshToken) {
    const unauthorized = NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Missing refresh token.', details: null, requestId } },
      { status: 401 }
    );
    unauthorized.headers.set('X-Request-Id', requestId);
    return unauthorized;
  }

  const response = await fetch(getBackendUrl('/auth/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId
    },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store'
  });

  const payload = (await response.json().catch(() => null)) as
    | { accessToken?: string; refreshToken?: string }
    | null;

  if (!response.ok) {
    const failed = NextResponse.json(payload, { status: response.status });
    failed.headers.set('X-Request-Id', requestId);
    return failed;
  }

  if (!payload?.accessToken || !payload.refreshToken) {
    const badGateway = NextResponse.json(
      { error: { code: 'BAD_GATEWAY', message: 'Invalid refresh response.', details: null, requestId } },
      { status: 502 }
    );
    badGateway.headers.set('X-Request-Id', requestId);
    return badGateway;
  }

  setAuthCookies(payload.accessToken, payload.refreshToken);
  const okResponse = NextResponse.json({ ok: true });
  okResponse.headers.set('X-Request-Id', requestId);
  return okResponse;
}
