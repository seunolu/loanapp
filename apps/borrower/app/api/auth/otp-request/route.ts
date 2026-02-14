import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getBackendUrl, getRequestIdFromHeaders } from '@/lib/api/server-helpers';

const schema = z.object({
  slug: z.string().min(1),
  phone: z.string().min(8),
  deviceId: z.string().min(1).optional()
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

  const response = await fetch(getBackendUrl('/auth/request-otp'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
      'X-Lender-Id': lenderId,
      ...(body.deviceId ? { 'X-Device-Id': body.deviceId } : {})
    },
    body: JSON.stringify({ phone: body.phone }),
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => null);
  const result = NextResponse.json(payload, { status: response.status });
  result.headers.set('X-Request-Id', requestId);
  return result;
}
