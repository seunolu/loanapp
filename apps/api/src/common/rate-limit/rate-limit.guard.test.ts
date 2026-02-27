import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

class FakeReflector {
  constructor(private readonly category?: string) {}
  getAllAndOverride() {
    return this.category ?? null;
  }
}

class FakeRedis {
  private readonly rows = new Map<string, number[]>();
  getClient() {
    return {
      zremrangebyscore: async (key: string, min: number, max: number) => {
        const values = this.rows.get(key) ?? [];
        this.rows.set(
          key,
          values.filter((value) => value > Number(max))
        );
      },
      zadd: async (key: string, score: number) => {
        const values = this.rows.get(key) ?? [];
        values.push(Number(score));
        this.rows.set(key, values);
      },
      expire: async () => 1,
      zcard: async (key: string) => (this.rows.get(key) ?? []).length,
      zrange: async (key: string, ...args: any[]) => {
        const first = (this.rows.get(key) ?? []).sort((a, b) => a - b)[0];
        return first == null ? [] : ['String(score)', String(first)];
      }
    };
  }
}

function makeCtx(req: any, res: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res
    }),
    getClass: () => null as any,
    getHandler: () => null as any
  } as ExecutionContext;
}

test('RateLimitGuard composes tenant-aware key for authenticated calls', async () => {
  const redis = new FakeRedis();
  let observedKey = '';
  const client = redis.getClient();
  const originalAdd = client.zadd;
  client.zadd = async (key: string, score: number) => {
    observedKey = key;
    return originalAdd.call(client, key, score);
  };
  const guard = new RateLimitGuard(
    new FakeReflector('GENERIC_API') as any,
    { getClient: () => client } as any,
    { get: () => ({ windowSeconds: 60, maxRequests: 2, keyStrategy: 'USER+TENANT' }) } as any,
    { get: () => false } as any
  );
  const req = {
    path: '/api/v1/admin/loan-applications',
    ip: '127.0.0.1',
    user: { adminId: 'admin_1', tenantId: 'tenant_1' }
  };
  const res = { setHeader: () => undefined };
  const ok = await guard.canActivate(makeCtx(req, res));
  assert.equal(ok, true);
  assert.match(observedKey, /user:admin_1:tenant:tenant_1/);
});

test('RateLimitGuard returns 429 after policy max exceeded', async () => {
  const redis = new FakeRedis();
  const guard = new RateLimitGuard(
    new FakeReflector('AUTH') as any,
    redis as any,
    { get: () => ({ windowSeconds: 60, maxRequests: 1, keyStrategy: 'IP' }) } as any,
    { get: () => false } as any
  );
  const req = { path: '/api/v1/auth/login', ip: '127.0.0.1', user: undefined };
  const res = { setHeader: () => undefined };

  await guard.canActivate(makeCtx(req, res));
  await assert.rejects(
    () => guard.canActivate(makeCtx(req, res)),
    (error: unknown) => error instanceof HttpException
  );
});



