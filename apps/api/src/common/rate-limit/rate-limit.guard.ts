import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { RedisService } from '../redis/redis.service';
import type { RequestWithId } from '../types/request-with-id';
import { RATE_LIMIT_CATEGORY_META } from './rate-limit.decorator';
import type { RateLimitCategory, RateLimitKeyStrategy } from './rate-limit.policy';
import { RateLimitPolicyService } from './rate-limit.policy';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly policyService: RateLimitPolicyService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithId>();
    const res = context.switchToHttp().getResponse<Response>();
    const path = (req.path ?? '').toLowerCase();

    if (path === '/health' || path === '/ready' || path === '/metrics') {
      return true;
    }

    const category =
      this.reflector.getAllAndOverride<RateLimitCategory>(RATE_LIMIT_CATEGORY_META, [
        context.getHandler(),
        context.getClass()
      ]) ?? 'GENERIC_API';
    const policy = this.policyService.get(category);
    const key = this.resolveKey(req, policy.keyStrategy, category);

    try {
      const retryAfterSeconds = await this.consumeSlidingWindow(
        `rl:v2:${category}:${key}`,
        policy.windowSeconds,
        policy.maxRequests
      );
      if (retryAfterSeconds > 0) {
        res.setHeader('Retry-After', String(retryAfterSeconds));
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
      // fail-open if redis is unavailable
      return true;
    }

    return true;
  }

  private resolveKey(req: RequestWithId, strategy: RateLimitKeyStrategy, category: RateLimitCategory): string {
    const ip = req.ip ?? 'unknown-ip';
    const user = (req.user ?? {}) as {
      tenantId?: string;
      lenderId?: string;
      adminId?: string;
      borrowerId?: string;
      id?: string;
    };
    const tenantId = user.tenantId ?? user.lenderId ?? 'unknown-tenant';
    const userId = user.adminId ?? user.borrowerId ?? user.id ?? 'anonymous';
    const provider = req.path?.includes('paystack') ? 'paystack' : 'webhook';

    switch (strategy) {
      case 'IP':
        return `ip:${ip}`;
      case 'USER':
        return `user:${userId}`;
      case 'TENANT':
        return `tenant:${tenantId}`;
      case 'IP+TENANT':
        if (category === 'PAYMENT_WEBHOOK') {
          return `provider:${provider}:ip:${ip}`;
        }
        return `ip:${ip}:tenant:${tenantId}`;
      case 'USER+TENANT':
      default:
        return `user:${userId}:tenant:${tenantId}`;
    }
  }

  private async consumeSlidingWindow(key: string, windowSec: number, limit: number): Promise<number> {
    const client = this.redisService.getClient();
    const now = Date.now();
    const windowStart = now - windowSec * 1000;
    const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

    await client.zremrangebyscore(key, 0, windowStart);
    await client.zadd(key, now, member);
    await client.expire(key, windowSec);

    const count = await client.zcard(key);
    if (count <= limit) {
      return 0;
    }

    const earliest = await client.zrange(key, 0, 0, 'WITHSCORES');
    const earliestScore = earliest.length >= 2 ? Number(earliest[1]) : now;
    const retryAfterMs = Math.max(0, earliestScore + windowSec * 1000 - now);
    return Math.ceil(retryAfterMs / 1000);
  }
}

