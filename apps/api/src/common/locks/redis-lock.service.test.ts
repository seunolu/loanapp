import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { RedisLockService } from './redis-lock.service';

class FakeRedisClient {
  private readonly store = new Map<string, string>();

  async set(key: string, value: string, _px: string, _ttl: number, nx: string) {
    if (nx === 'NX' && this.store.has(key)) {
      return null;
    }
    this.store.set(key, value);
    return 'OK';
  }

  async eval(_script: string, _keysCount: number, key: string, token: string) {
    if (this.store.get(key) === token) {
      this.store.delete(key);
      return 1;
    }
    return 0;
  }

  has(key: string) {
    return this.store.has(key);
  }
}

test('redis lock release only removes key when token matches', async () => {
  const client = new FakeRedisClient();
  const service = new RedisLockService({ getClient: () => client } as any);

  const first = await service.acquireLock('lock:a', 1000);
  assert.ok(first);
  assert.equal(client.has('lock:a'), true);

  // Simulate wrong token release attempt.
  await client.eval('', 1, 'lock:a', 'wrong-token');
  assert.equal(client.has('lock:a'), true);

  await first?.release();
  assert.equal(client.has('lock:a'), false);
});

