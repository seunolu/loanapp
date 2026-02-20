import { Global, Module } from '@nestjs/common';
import { StructuredLoggerService } from './logger.service';
import { LoggerInterceptor } from './logger.interceptor';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { PromMetricsService } from './prom-metrics.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, PromMetricsService, StructuredLoggerService, LoggerInterceptor],
  exports: [MetricsService, PromMetricsService, StructuredLoggerService, LoggerInterceptor]
})
export class MetricsModule {}
