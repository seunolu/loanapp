import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { HttpException } from '@nestjs/common';
import { RedisRateLimitMiddleware } from './redis-rate-limit.middleware';

type ZEntry = { score: number; member: string };

class FakeRedisClient {
  private readonly zsets = new Map<string, ZEntry[]>();

  private get(key: string): ZEntry[] {
    const existing = this.zsets.get(key);
    if (existing) return existing;
    const created: ZEntry[] = [];
    this.zsets.set(key, created);
    return created;
  }

  async zremrangebyscore(key: string, min: number, max: number) {
    const rows = this.get(key);
    const kept = rows.filter((row) => !(row.score >= Number(min) && row.score <= Number(max)));
    this.zsets.set(key, kept);
    return rows.length - kept.length;
  }

  async zadd(key: string, score: number, member: string) {
    const rows = this.get(key);
    rows.push({ score: Number(score), member });
    rows.sort((a, b) => a.score - b.score);
    return 1;
  }

  async expire(_key: string, _ttl: number) {
    return 1;
  }

  async zcard(key: string) {
    return this.get(key).length;
  }

  async zrange(key: string, start: number, stop: number, _withScores: string) {
    const rows = this.get(key);
    const end = stop >= 0 ? stop + 1 : rows.length + stop + 1;
    const selected = rows.slice(start, end);
    if (selected.length === 0) return [];
    const first = selected[0];
    return [first.member, String(first.score)];
  }
}

test('redis rate limit middleware blocks auth endpoint after threshold', async () => {
  const client = new FakeRedisClient();
  const middleware = new RedisRateLimitMiddleware({ getClient: () => client } as any);
  const req: any = {
    path: '/api/v1/auth/login',
    ip: '127.0.0.1',
    header: (name: string) => (name === 'user-agent' ? 'node-test' : undefined)
  };
  const res: any = {};

  for (let i = 0; i < 20; i += 1) {
    await middleware.use(req, res, () => undefined);
  }

  let error: unknown;
  try {
    await middleware.use(req, res, () => undefined);
  } catch (err) {
    error = err;
  }

  assert.ok(error instanceof HttpException);
  const response = (error as HttpException).getResponse() as any;
  assert.equal(response.error.code, 'RATE_LIMITED');
  assert.ok(Number(response.error.details.retryAfterSeconds) > 0);
});

