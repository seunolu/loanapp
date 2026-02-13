import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { Env } from '../config/env.schema';
import { RedisService } from '../redis/redis.service';
import type { RequestWithId } from '../types/request-with-id';

@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService<Env, true>
  ) {}

  async use(req: RequestWithId, _res: Response, next: NextFunction): Promise<void> {
    if (req.path === '/health') {
      next();
      return;
    }

    const ip = req.ip;
    if (!ip) {
      next();
      return;
    }

    try {
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
}
