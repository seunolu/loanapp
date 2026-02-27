import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { Env } from '../config/env.schema';
import { extractClientIp } from '../http/ip';
import { RedisService } from '../redis/redis.service';
import type { RequestWithId } from '../types/request-with-id';

@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService<Env, true>
  ) {}

  async use(req: RequestWithId, _res: Response, next: NextFunction): Promise<void> {
    if (req.path === '/health' || req.path === '/metrics') {
      next();
      return;
    }

    const trustProxy = this.configService.get('TRUST_PROXY', { infer: true });
    const ip = extractClientIp(req, trustProxy);
    if (!ip) {
      next();
      return;
    }

    try {
      const publicScope = this.getPublicRateScope(req);
      if (publicScope) {
        const ttl = this.configService.get('RATE_TTL', { infer: true });
        const defaultLimit = this.configService.get('RATE_LIMIT', { infer: true });
        const limit = publicScope === 'auth' ? Math.max(5, Math.floor(defaultLimit / 5)) : defaultLimit;
        const tenantKey = this.resolveTenantRateKey(req);
        const authFingerprint = publicScope === 'auth' ? this.getAuthFingerprint(req, ip) : null;
        const publicKey = authFingerprint
          ? `rl:public:${publicScope}:fp:${authFingerprint}`
          : tenantKey
            ? `rl:public:${publicScope}:tenant:${tenantKey}`
            : `rl:public:${publicScope}:ip:${ip}`;

        const publicCount = await this.redisService.incrementWithWindow(publicKey, ttl);
        if (publicCount > limit) {
          throw new HttpException(
            {
              code: 'RATE_LIMITED',
              message: 'Too many public endpoint requests. Please try again later.',
              details: { reason: 'public_rate_limit', scope: publicScope }
            },
            HttpStatus.TOO_MANY_REQUESTS
          );
        }
      }

      const max = this.configService.get('GLOBAL_RATE_LIMIT_IP_MAX', { infer: true });
      const windowSec = this.configService.get('GLOBAL_RATE_LIMIT_IP_WINDOW_SEC', { infer: true });
      const count = await this.redisService.incrementWithWindow(`rl:global:ip:${ip}`, windowSec);
      if (count > max) {
        throw new HttpException(
          {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            details: { reason: 'global_rate_limit' }
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // fail-open if limiter backend is unavailable
      next();
      return;
    }

    next();
  }

  private getPublicRateScope(req: RequestWithId): string | null {
    const method = req.method.toUpperCase();
    const path = req.path.toLowerCase();

    if (method === 'GET' && path.endsWith('/tenants/resolve')) {
      return 'tenants_resolve';
    }
    if (method === 'POST' && path.includes('/auth/')) {
      return 'auth';
    }
    if (method === 'POST' && (path.endsWith('/loan-applications') || path.endsWith('/loans/applications'))) {
      return 'loan_applications_create';
    }
    return null;
  }

  private resolveTenantRateKey(req: RequestWithId): string | null {
    const user = req.user as { tenantId?: string; lenderId?: string } | undefined;
    const tenantFromUser = user?.tenantId ?? user?.lenderId;
    if (typeof tenantFromUser === 'string' && tenantFromUser.trim().length > 0) {
      return tenantFromUser.trim();
    }
    return null;
  }

  private getAuthFingerprint(req: RequestWithId, ip: string): string {
    const ua = (req.header('user-agent') ?? 'unknown').trim().toLowerCase();
    return `${ip}:${ua}`;
  }
}
