import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

export type RateLimitCategory =
  | 'AUTH'
  | 'OTP'
  | 'LOAN_APPLICATION_SUBMIT'
  | 'PUBLIC_READ'
  | 'LOAN_MUTATION'
  | 'PAYMENT_WEBHOOK'
  | 'GENERIC_API';

export type RateLimitKeyStrategy =
  | 'IP'
  | 'USER'
  | 'TENANT'
  | 'USER+TENANT'
  | 'IP+TENANT'
  | 'IP+DEVICE'
  | 'PHONE+IP'
  | 'BORROWER+TENANT';

export type RateLimitPolicy = {
  windowSeconds: number;
  maxRequests: number;
  keyStrategy: RateLimitKeyStrategy;
};

@Injectable()
export class RateLimitPolicyService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  get(category: RateLimitCategory): RateLimitPolicy {
    switch (category) {
      case 'AUTH':
        return {
          windowSeconds: this.int('RATE_LIMIT_AUTH_WINDOW_SECONDS', 300),
          maxRequests: this.int('RATE_LIMIT_AUTH_MAX', 10),
          keyStrategy: 'IP+DEVICE'
        };
      case 'OTP':
        return {
          windowSeconds: this.int('RATE_LIMIT_OTP_WINDOW_SECONDS', 600),
          maxRequests: this.int('RATE_LIMIT_OTP_MAX', 5),
          keyStrategy: 'PHONE+IP'
        };
      case 'LOAN_APPLICATION_SUBMIT':
        return {
          windowSeconds: this.int('RATE_LIMIT_LOAN_APPLICATION_SUBMIT_WINDOW_SECONDS', 600),
          maxRequests: this.int('RATE_LIMIT_LOAN_APPLICATION_SUBMIT_MAX', 20),
          keyStrategy: 'BORROWER+TENANT'
        };
      case 'PUBLIC_READ':
        return {
          windowSeconds: this.int('RATE_LIMIT_PUBLIC_READ_WINDOW_SECONDS', 60),
          maxRequests: this.int('RATE_LIMIT_PUBLIC_READ_MAX', 120),
          keyStrategy: 'IP'
        };
      case 'LOAN_MUTATION':
        return {
          windowSeconds: this.int('RATE_LIMIT_LOAN_MUTATION_WINDOW_SECONDS', 60),
          maxRequests: this.int('RATE_LIMIT_LOAN_MUTATION_MAX', 60),
          keyStrategy: 'USER+TENANT'
        };
      case 'PAYMENT_WEBHOOK':
        return {
          windowSeconds: this.int('RATE_LIMIT_PAYMENT_WEBHOOK_WINDOW_SECONDS', 60),
          maxRequests: this.int('RATE_LIMIT_PAYMENT_WEBHOOK_MAX', 300),
          keyStrategy: 'IP+TENANT'
        };
      case 'GENERIC_API':
      default:
        return {
          windowSeconds: this.int('RATE_LIMIT_GENERIC_WINDOW_SECONDS', 60),
          maxRequests: this.int('RATE_LIMIT_GENERIC_MAX', 200),
          keyStrategy: 'IP'
        };
    }
  }

  private int(key: keyof Env | string, fallback: number): number {
    const value = Number(this.configService.get(key as keyof Env, { infer: true } as never) ?? fallback);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  }
}
