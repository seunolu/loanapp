import { Module } from '@nestjs/common';
import { JobsModule as CoreJobsModule } from '../common/jobs/jobs.module';
import { CollectionsJobHandler } from './job-handlers/collections-job.handler';
import { DisbursementJobHandler } from './job-handlers/disbursement-job.handler';
import { RepaymentJobHandler } from './job-handlers/repayment-job.handler';
import { JobOutboxService } from './job-outbox.service';
import { JobRunnerService } from './job-runner.service';

@Module({
  imports: [CoreJobsModule],
  providers: [
    JobOutboxService,
    JobRunnerService,
    DisbursementJobHandler,
    RepaymentJobHandler,
    CollectionsJobHandler
  ],
  exports: [JobOutboxService, JobRunnerService]
})
export class JobsInfrastructureModule {}

