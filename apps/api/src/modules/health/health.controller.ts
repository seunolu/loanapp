import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  async getHealth() {
    return {
      ...this.healthService.getLiveness(),
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
