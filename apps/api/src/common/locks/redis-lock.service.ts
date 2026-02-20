import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

type AcquiredLock = {
  token: string;
  release: () => Promise<void>;
};

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

@Injectable()
export class RedisLockService {
  constructor(private readonly redisService: RedisService) {}

  async acquireLock(key: string, ttlMs: number): Promise<AcquiredLock | null> {
    const token = randomUUID();
    const result = await this.redisService.getClient().set(key, token, 'PX', ttlMs, 'NX');
    if (result !== 'OK') {
      return null;
    }

    return {
      token,
      release: async () => {
        await this.redisService.getClient().eval(RELEASE_SCRIPT, 1, key, token);
      }
    };
  }

  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T | 'skipped'> {
    const lock = await this.acquireLock(key, ttlMs);
    if (!lock) return 'skipped';
    try {
      return await fn();
    } finally {
      await lock.release();
    }
  }
}

