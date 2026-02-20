import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { RequestIdMiddleware } from './request-id.middleware';

test('request-id middleware sets x-request-id header for responses', () => {
  const middleware = new RequestIdMiddleware();
  const headers = new Map<string, string>();
  const req = {
    header: () => undefined
  } as any;
  const res = {
    setHeader: (key: string, value: string) => {
      headers.set(key.toLowerCase(), value);
    }
  } as any;

  middleware.use(req, res, () => undefined);

  const requestId = headers.get('x-request-id');
  assert.ok(requestId && requestId.length > 0);
  assert.equal(req.requestId, requestId);
});

