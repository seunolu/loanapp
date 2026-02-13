import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

type HealthResponse = {
  status: 'ok' | 'degraded';
  version: string;
  database: {
    status: 'up' | 'down';
  };
};

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    const dbUp = await this.healthService.isDatabaseHealthy();

    return {
      status: dbUp ? 'ok' : 'degraded',
      version: this.healthService.getVersion(),
      database: {
        status: dbUp ? 'up' : 'down'
      }
    };
  }
}
