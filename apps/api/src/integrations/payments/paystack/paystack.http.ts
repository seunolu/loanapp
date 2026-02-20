import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../common/config/env.schema';

@Injectable()
export class PaystackHttpClient {
  private readonly logger = new Logger(PaystackHttpClient.name);

  constructor(private readonly configService: ConfigService<Env, true>) {}

  async request(path: string, init: RequestInit): Promise<unknown> {
    const baseUrl = this.configService.get('PAYSTACK_BASE_URL', { infer: true });
    const secret = this.configService.get('PAYSTACK_SECRET_KEY', { infer: true });

    const withHeaders: RequestInit = {
      ...init,
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {})
      }
    };

    const startedAt = Date.now();
    try {
      const first = await fetch(`${baseUrl}${path}`, withHeaders);
      if (!first.ok) {
        const retry = await fetch(`${baseUrl}${path}`, withHeaders);
        if (!retry.ok) {
          throw new Error(`Paystack request failed: ${retry.status}`);
        }
        return retry.json();
      }
      return first.json();
    } finally {
      this.logger.debug({
        action: 'PAYSTACK_HTTP',
        metadata: {
          path,
          durationMs: Date.now() - startedAt
        }
      });
    }
  }
}

