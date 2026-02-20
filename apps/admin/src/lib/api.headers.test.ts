import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { listLoanProducts, setAccessToken } from './api';

test('admin API client sends x-request-id header', async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000';
  setAccessToken(null);

  let capturedRequestId: string | null = null;
  const originalFetch = global.fetch;
  global.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers ?? {});
    capturedRequestId = headers.get('x-request-id');
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }) as typeof fetch;

  try {
    const result = await listLoanProducts();
    assert.deepEqual(result, []);
    assert.equal(typeof capturedRequestId, 'string');
    assert.ok((capturedRequestId ?? '').length > 0);
  } finally {
    global.fetch = originalFetch;
  }
});
