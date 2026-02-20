import { Module } from '@nestjs/common';
import { AdminLoansModule } from '../../modules/admin-loans/admin-loans.module';
import { AdminReportsModule } from '../../modules/admin-reports/admin-reports.module';
import { LoansModule } from '../../modules/loans/loans.module';
import { JobQueueModule } from './job-queue.module';
import { JobsRunnerService } from './jobs-runner.service';
import { JobsSchedulerService } from './jobs-scheduler.service';
import { JobsService } from './jobs.service';

@Module({
  imports: [LoansModule, AdminLoansModule, AdminReportsModule, JobQueueModule],
  providers: [JobsService, JobsRunnerService, JobsSchedulerService],
  exports: [JobsService, JobsRunnerService, JobsSchedulerService, JobQueueModule]
})
export class JobsModule {}
