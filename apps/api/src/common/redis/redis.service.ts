import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../config/env.schema';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(@Optional() @Inject(ConfigService) private readonly configService?: ConfigService<Env, true>) {
    const redisUrl = this.configService?.get('REDIS_URL', { infer: true }) ?? process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.client = new Redis(redisUrl);
    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  async incrementWithWindow(key: string, windowSec: number): Promise<number> {
    const count = await this.client.incr(key);
    // Set TTL only on first increment to preserve fixed-window behavior
    // and avoid EXPIRE option compatibility issues across Redis versions.
    if (count === 1) {
      await this.client.expire(key, windowSec);
    }
    return count;
  }

  async setIfNotExists(key: string, value: string, ttlSec: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSec, 'NX');
    return result === 'OK';
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
