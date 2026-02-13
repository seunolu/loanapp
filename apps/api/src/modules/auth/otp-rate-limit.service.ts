import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

type BucketConfig = {
  limit: number;
  windowMs: number;
};

@Injectable()
export class OtpRateLimitService {
  constructor(private readonly redisService: RedisService) {}

  async check(
    phone: string,
    ip: string | null,
    phoneConfig: BucketConfig,
    ipConfig: BucketConfig
  ): Promise<boolean> {
    const phoneKey = this.normalizeKey(`otp:rl:phone:${phone}`);
    const phoneAllowed = await this.consume(phoneKey, phoneConfig);

    const ipAllowed = ip ? await this.consume(this.normalizeKey(`otp:rl:ip:${ip}`), ipConfig) : true;

    return phoneAllowed && ipAllowed;
  }

  private async consume(key: string, config: BucketConfig): Promise<boolean> {
    const windowSec = Math.max(1, Math.ceil(config.windowMs / 1000));
    const count = await this.redisService.incrementWithWindow(key, windowSec);
    return count <= config.limit;
  }

  private normalizeKey(input: string): string {
    return input.toLowerCase().trim();
  }
}
