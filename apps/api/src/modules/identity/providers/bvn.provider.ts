import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../common/config/env.schema';

export const BVN_PROVIDER = Symbol('BVN_PROVIDER');

export type BvnVerificationResult = {
  fullName: string;
  dob: string;
  phone: string;
};

export interface BvnProvider {
  verify(bvn: string): Promise<BvnVerificationResult>;
}

@Injectable()
export class NibssBvnProvider implements BvnProvider {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  async verify(bvn: string): Promise<BvnVerificationResult> {
    const baseUrl = this.configService.get('BVN_PROVIDER_BASE_URL', { infer: true });
    const apiKey = this.configService.get('BVN_PROVIDER_API_KEY', { infer: true });
    const timeoutMs = this.configService.get('BVN_PROVIDER_TIMEOUT_MS', { infer: true });

    if (!baseUrl || !apiKey) {
      throw new Error('BVN provider is not configured.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/bvn/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bvn }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`BVN provider failed (${response.status})`);
      }

      const payload = (await response.json()) as {
        fullName?: string;
        dob?: string;
        phone?: string;
      };

      if (!payload.fullName || !payload.dob || !payload.phone) {
        throw new Error('BVN provider returned incomplete data.');
      }

      return {
        fullName: payload.fullName,
        dob: payload.dob,
        phone: payload.phone
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
