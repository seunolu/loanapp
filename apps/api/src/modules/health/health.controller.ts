import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  async getHealth() {
    const deep = await this.healthService.getDeepHealth();
    return {
      ...deep,
      status: 'ok' as const,
      version: this.healthService.getVersion()
    };
  }

  @Get('ready')
  async getReadiness() {
    const readiness = await this.healthService.getReadiness();
    if (readiness.status !== 'ready') {
      throw new ServiceUnavailableException({
        code: 'NOT_READY',
        message: 'Service is not ready.',
        details: readiness
      });
    }
    return readiness;
  }
}
