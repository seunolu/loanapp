import { NextResponse } from 'next/server';

import {
  getBackendUrl,
  getRequestIdFromHeaders,
  readAccessToken,
  readRefreshToken,
  setAuthCookies
} from '@/lib/api/server-helpers';

type RouteContext = {
  params: {
    path: string[];
  };
};

async function forward(request: Request, context: RouteContext): Promise<NextResponse> {
  const path = context.params.path.join('/');
  const requestId = getRequestIdFromHeaders(request.headers);
  let accessToken = readAccessToken();
  const refreshToken = readRefreshToken();
  const incomingUrl = new URL(request.url);
  const url = `${getBackendUrl(`/${path}`)}${incomingUrl.search}`;

  const headers = new Headers();
  headers.set('X-Request-Id', requestId);
  const incomingContentType = request.headers.get('content-type');
  if (incomingContentType) {
    headers.set('Content-Type', incomingContentType);
  }
  const incomingLenderId = request.headers.get('x-lender-id');
  if (incomingLenderId) {
    headers.set('X-Lender-Id', incomingLenderId);
  }
  if (!accessToken && refreshToken) {
    accessToken = await refreshAccessToken(refreshToken, requestId);
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();
  const backendResponse = await fetch(url, {
    method,
    headers,
    body,
    cache: 'no-store'
  });

  const payload = await backendResponse.text();
  const responseHeaders = new Headers();
  responseHeaders.set('X-Request-Id', backendResponse.headers.get('x-request-id') ?? requestId);
  const backendContentType = backendResponse.headers.get('content-type');
  if (backendContentType) {
    responseHeaders.set('Content-Type', backendContentType);
  }

  return new NextResponse(payload, {
    status: backendResponse.status,
    headers: responseHeaders
  });
}

async function refreshAccessToken(refreshToken: string, requestId: string): Promise<string | null> {
  const response = await fetch(getBackendUrl('/admin/auth/refresh'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshToken}`,
      'X-Request-Id': requestId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({}),
    cache: 'no-store'
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }
  const payload = (await response.json().catch(() => null)) as { accessToken?: string; refreshToken?: string } | null;
  if (!payload?.accessToken) {
    return null;
  }

  if (payload.refreshToken) {
    setAuthCookies(payload.accessToken, payload.refreshToken);
  }

  return payload.accessToken;
}

export async function GET(request: Request, context: RouteContext) {
  return forward(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return forward(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return forward(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return forward(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return forward(request, context);
}
