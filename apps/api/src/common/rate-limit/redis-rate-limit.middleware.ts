import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { RedisService } from '../redis/redis.service';
import type { RequestWithId } from '../types/request-with-id';

type LimitRule = {
  key: string;
  max: number;
  windowSec: number;
};

@Injectable()
export class RedisRateLimitMiddleware implements NestMiddleware {
  constructor(private readonly redisService: RedisService) {}

  async use(req: RequestWithId, _res: Response, next: NextFunction): Promise<void> {
    const path = (req.path ?? '').toLowerCase();
    if (path === '/health' || path === '/ready' || path === '/metrics') {
      next();
      return;
    }

    try {
      const rule = this.resolveRule(req);
      const retryAfterSeconds = await this.consume(rule);
      if (retryAfterSeconds > 0) {
        throw new HttpException(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Please retry later.',
              details: { retryAfterSeconds }
            }
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // fail-open when Redis is unavailable
    }

    next();
  }

  private resolveRule(req: RequestWithId): LimitRule {
    const path = (req.path ?? '').toLowerCase();
    const ip = req.ip ?? 'unknown-ip';
    const user = (req.user ?? {}) as { tenantId?: string; lenderId?: string; adminId?: string; borrowerId?: string };
    const tenantId = user.tenantId ?? user.lenderId ?? null;
    const userId = user.adminId ?? user.borrowerId ?? null;

    if (path.includes('/auth/')) {
      const userAgent = (req.header('user-agent') ?? 'unknown').toLowerCase();
      return {
        key: `rl:auth:${ip}:${userAgent}`,
        max: 20,
        windowSec: 60
      };
    }

    if (path.includes('/webhooks/')) {
      return {
        key: `rl:webhook:${tenantId ?? ip}`,
        max: 300,
        windowSec: 60
      };
    }

    return {
      key: `rl:default:${tenantId ?? ip}:${userId ?? 'anon'}`,
      max: 120,
      windowSec: 60
    };
  }

  private async consume(rule: LimitRule): Promise<number> {
    const client = this.redisService.getClient();
    const now = Date.now();
    const windowStart = now - rule.windowSec * 1000;
    const key = rule.key;
    const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

    await client.zremrangebyscore(key, 0, windowStart);
    await client.zadd(key, now, member);
    await client.expire(key, rule.windowSec);
    const current = await client.zcard(key);
    if (current <= rule.max) {
      return 0;
    }

    const earliest = await client.zrange(key, 0, 0, 'WITHSCORES');
    const earliestScore = earliest.length >= 2 ? Number(earliest[1]) : now;
    const retryAfterMs = Math.max(0, earliestScore + rule.windowSec * 1000 - now);
    return Math.ceil(retryAfterMs / 1000);
  }
}

