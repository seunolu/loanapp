import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getBackendUrl, getRequestIdFromHeaders, setAuthCookies } from '@/lib/api/server-helpers';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const requestId = getRequestIdFromHeaders(request.headers);

  const response = await fetch(getBackendUrl('/admin/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorResponse = NextResponse.json(payload, { status: response.status });
    errorResponse.headers.set('X-Request-Id', requestId);
    return errorResponse;
  }

  const accessToken = (payload as { accessToken?: string }).accessToken;
  const refreshToken = (payload as { refreshToken?: string }).refreshToken;
  if (!accessToken || !refreshToken) {
    const badGateway = NextResponse.json(
      { error: { code: 'BAD_GATEWAY', message: 'Invalid login response.', details: null, requestId } },
      { status: 502 }
    );
    badGateway.headers.set('X-Request-Id', requestId);
    return badGateway;
  }

  setAuthCookies(accessToken, refreshToken);
  const okResponse = NextResponse.json({ ok: true });
  okResponse.headers.set('X-Request-Id', requestId);
  return okResponse;
}
