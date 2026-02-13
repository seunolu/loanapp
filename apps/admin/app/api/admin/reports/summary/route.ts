import { NextResponse } from 'next/server';

import { createAdminSdk } from '@/lib/api/admin-sdk';
import { getRequestIdFromHeaders, readAccessToken } from '@/lib/api/server-helpers';

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const accessToken = readAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized', details: null, requestId } },
      { status: 401 }
    );
  }

  const sdk = createAdminSdk({ accessToken });
  try {
    const payload = await sdk.getSummaryReport({ 'X-Request-Id': requestId });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'BAD_GATEWAY',
          message: error instanceof Error ? error.message : 'Failed to load summary.',
          details: null,
          requestId
        }
      },
      { status: 502 }
    );
  }
}
