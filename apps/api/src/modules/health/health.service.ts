import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../common/config/env.schema';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>
  ) {}

  async isDatabaseHealthy(): Promise<boolean> {
    return this.prisma.isHealthy();
  }

  getVersion(): string {
    return this.configService.get('APP_VERSION', { infer: true });
  }
}
