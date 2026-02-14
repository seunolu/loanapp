import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getBackendUrl, getRequestIdFromHeaders, setAuthCookies } from '@/lib/api/server-helpers';

const schema = z.object({
  slug: z.string().min(1),
  phone: z.string().min(8),
  otpRef: z.string().min(1),
  otp: z.string().length(6),
  deviceId: z.string().min(1),
  deviceName: z.string().optional(),
  platform: z.string().optional()
});

async function resolveLenderId(slug: string, requestId: string): Promise<string | null> {
  const response = await fetch(getBackendUrl(`/public/config/by-slug?slug=${encodeURIComponent(slug)}`), {
    method: 'GET',
    headers: {
      'X-Request-Id': requestId
    },
    cache: 'no-store'
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as { lenderId?: string } | null;
  return payload?.lenderId ?? null;
}

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const requestId = getRequestIdFromHeaders(request.headers);
  const lenderId = await resolveLenderId(body.slug, requestId);

  if (!lenderId) {
    const notFound = NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Unknown lender.', details: null, requestId } },
      { status: 404 }
    );
    notFound.headers.set('X-Request-Id', requestId);
    return notFound;
  }

  const response = await fetch(getBackendUrl('/auth/verify-otp'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
      'X-Lender-Id': lenderId,
      'X-Device-Id': body.deviceId
    },
    body: JSON.stringify({
      phone: body.phone,
      otpRef: body.otpRef,
      otp: body.otp,
      deviceId: body.deviceId,
      deviceName: body.deviceName ?? 'Borrower Web',
      platform: body.platform ?? 'web'
    }),
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
      { error: { code: 'BAD_GATEWAY', message: 'Invalid verify response.', details: null, requestId } },
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
