import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../common/config/env.schema';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

type UpDown = 'up' | 'down';

export type DeepHealth = {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  memoryUsage: NodeJS.MemoryUsage;
  database: {
    status: UpDown;
    latencyMs: number;
  };
  redis: {
    status: UpDown;
  };
  queue: {
    waiting: number;
    pendingDue: number;
    active: number;
    failed: number;
    dlqLast24h: number;
  };
  version: string;
  timestamp: string;
};

export type Readiness = {
  status: 'ready' | 'not_ready';
  version: string;
  redisRequired: boolean;
  checks: {
    database: UpDown;
    redis: UpDown;
  };
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
    @Optional() @Inject(RedisService) private readonly redisService?: RedisService
  ) {}

  async getDeepHealth(): Promise<DeepHealth> {
    const [database, redis, queue] = await Promise.all([
      this.getDatabaseHealth(),
      this.getRedisHealth(),
      this.getQueueHealth()
    ]);

    const status: DeepHealth['status'] =
      database.status === 'up' && redis.status === 'up' ? 'ok' : 'degraded';

    return {
      status,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage(),
      database,
      redis,
      queue,
      version: this.getVersion(),
      timestamp: new Date().toISOString()
    };
  }

  getLiveness(): { status: 'ok'; version: string } {
    return {
      status: 'ok',
      version: this.getVersion()
    };
  }

  async getReadiness(): Promise<Readiness> {
    const [database, redis] = await Promise.all([this.getDatabaseHealth(), this.getRedisHealth()]);
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });
    const redisRequired = this.configService.get('HEALTH_READY_REDIS_REQUIRED', { infer: true }) || nodeEnv === 'production';
    const ready = database.status === 'up' && (!redisRequired || redis.status === 'up');
    return {
      status: ready ? 'ready' : 'not_ready',
      version: this.getVersion(),
      redisRequired,
      checks: {
        database: database.status,
        redis: redis.status
      }
    };
  }

  async getDatabaseHealth(): Promise<{ status: UpDown; latencyMs: number }> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch {
      return { status: 'down', latencyMs: Date.now() - startedAt };
    }
  }

  async getRedisHealth(): Promise<{ status: UpDown }> {
    try {
      if (!this.redisService) {
        return { status: 'down' };
      }
      await this.redisService.ping();
      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }

  async getQueueHealth(): Promise<{ waiting: number; pendingDue: number; active: number; failed: number; dlqLast24h: number }> {
    try {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const [waiting, active, failed] = await Promise.all([
        this.prisma.job.count({ where: { status: 'PENDING' } }),
        this.prisma.job.count({ where: { status: 'PROCESSING' } }),
        this.prisma.job.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } })
      ]);
      const [pendingDue, dlqLast24h] = await Promise.all([
        this.prisma.job.count({
          where: {
            status: 'PENDING',
            runAt: { lte: now }
          }
        }),
        (this.prisma as any).jobDlq.count({
          where: {
            createdAt: { gte: dayAgo }
          }
        })
      ]);
      return { waiting, pendingDue, active, failed, dlqLast24h };
    } catch {
      return { waiting: 0, pendingDue: 0, active: 0, failed: 0, dlqLast24h: 0 };
    }
  }

  getVersion(): string {
    return this.configService.get('APP_VERSION', { infer: true });
  }
}
