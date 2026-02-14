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

async function refreshAccessToken(refreshToken: string, requestId: string): Promise<string | null> {
  const response = await fetch(getBackendUrl('/auth/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId
    },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store'
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as
    | { accessToken?: string; refreshToken?: string }
    | null;

  if (!payload?.accessToken || !payload.refreshToken) {
    return null;
  }

  setAuthCookies(payload.accessToken, payload.refreshToken);
  return payload.accessToken;
}

async function forward(request: Request, context: RouteContext): Promise<NextResponse> {
  const path = context.params.path.join('/');
  const requestId = getRequestIdFromHeaders(request.headers);
  const incomingUrl = new URL(request.url);
  const targetUrl = `${getBackendUrl(`/${path}`)}${incomingUrl.search}`;

  let accessToken = readAccessToken();
  const refreshToken = readRefreshToken();
  if (!accessToken && refreshToken) {
    accessToken = await refreshAccessToken(refreshToken, requestId);
  }

  const headers = new Headers();
  headers.set('X-Request-Id', requestId);
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  const deviceId = request.headers.get('x-device-id');
  if (deviceId) {
    headers.set('X-Device-Id', deviceId);
  }
  const lenderId = request.headers.get('x-lender-id');
  if (lenderId) {
    headers.set('X-Lender-Id', lenderId);
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();
  const backendResponse = await fetch(targetUrl, {
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
