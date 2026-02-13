import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getBackendUrl, getRequestIdFromHeaders } from '@/lib/api/server-helpers';

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12)
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const requestId = getRequestIdFromHeaders(request.headers);

  const response = await fetch(getBackendUrl('/admin/auth/setup-password'), {
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
    const failed = NextResponse.json(payload, { status: response.status });
    failed.headers.set('X-Request-Id', requestId);
    return failed;
  }

  const okResponse = NextResponse.json({ ok: true });
  okResponse.headers.set('X-Request-Id', requestId);
  return okResponse;
}
