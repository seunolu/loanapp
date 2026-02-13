import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../config/env.schema';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.client = new Redis(this.configService.get('REDIS_URL', { infer: true }));
    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  async incrementWithWindow(key: string, windowSec: number): Promise<number> {
    const tx = this.client.multi();
    tx.incr(key);
    tx.expire(key, windowSec, 'NX');
    const result = await tx.exec();
    const count = result?.[0]?.[1];
    return typeof count === 'number' ? count : Number(count ?? 0);
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
