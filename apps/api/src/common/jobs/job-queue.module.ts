import { Module } from '@nestjs/common';
import { JobQueueService } from './job-queue.service';
import { QueueMetricsPoller } from './queue-metrics.poller';

@Module({
  providers: [JobQueueService, QueueMetricsPoller],
  exports: [JobQueueService]
})
export class JobQueueModule {}
