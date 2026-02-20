import { ForbiddenException, Get, Header, NotFoundException, Req, Res, Controller } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { Env } from '../config/env.schema';
import { getRequestIdFrom } from './request-context';
import type { RequestWithId } from '../types/request-with-id';
import { PromMetricsService } from './prom-metrics.service';

@Controller()
export class MetricsController {
  constructor(
    private readonly promMetrics: PromMetricsService,
    private readonly configService: ConfigService<Env, true>
  ) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(@Req() req: RequestWithId, @Res({ passthrough: true }) res: Response): Promise<string> {
    const enabled = this.configService.get('METRICS_ENABLED', { infer: true });
    if (!enabled) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Metrics endpoint is disabled.',
        details: null
      });
    }

    const expectedToken = this.configService.get('METRICS_TOKEN', { infer: true });
    const providedToken = req.header('x-metrics-token');
    if (expectedToken && providedToken !== expectedToken) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Invalid metrics token.',
        details: null
      });
    }

    res.setHeader('x-request-id', getRequestIdFrom(req));
    return this.promMetrics.renderPrometheus();
  }
}
