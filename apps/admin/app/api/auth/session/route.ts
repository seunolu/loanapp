import { NextResponse } from 'next/server';

import { getBackendUrl, getRequestIdFromHeaders, readAccessToken } from '@/lib/api/server-helpers';

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const accessToken = readAccessToken();
  if (!accessToken) {
    const unauthorized = NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized', details: null, requestId } },
      { status: 401 }
    );
    unauthorized.headers.set('X-Request-Id', requestId);
    return unauthorized;
  }

  const response = await fetch(getBackendUrl('/admin/me'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Request-Id': requestId
    },
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => null);
  const result = NextResponse.json(payload, { status: response.status });
  result.headers.set('X-Request-Id', requestId);
  return result;
}
