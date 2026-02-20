import { Injectable, Logger } from '@nestjs/common';
import { JobType } from '@prisma/client';
import { JobQueueService } from '../common/jobs/job-queue.service';
import { CollectionsJobHandler } from './job-handlers/collections-job.handler';
import { DisbursementJobHandler } from './job-handlers/disbursement-job.handler';
import { RepaymentJobHandler } from './job-handlers/repayment-job.handler';

@Injectable()
export class JobRunnerService {
  private readonly logger = new Logger(JobRunnerService.name);
  private readonly workerId = process.env.WORKER_ID?.trim() || 'job-runner';

  constructor(
    private readonly queue: JobQueueService,
    private readonly disbursementHandler: DisbursementJobHandler,
    private readonly repaymentHandler: RepaymentJobHandler,
    private readonly collectionsHandler: CollectionsJobHandler
  ) {}

  async processOnce(): Promise<boolean> {
    const job = await this.queue.claimNextJob({ workerId: this.workerId });
    if (!job) return false;
    const startedAt = Date.now();

    try {
      await this.dispatch(job.type, job.payload as Record<string, unknown>);
      await this.queue.markSucceeded(job.id, this.workerId);
      this.logger.log(
        `job_succeeded jobId=${job.id} tenantId=${job.tenantId} type=${job.type} attempt=${job.attempts + 1} durationMs=${Date.now() - startedAt}`
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown job error';
      await this.queue.markFailed(job.id, this.workerId, message);
      this.logger.error(
        `job_failed jobId=${job.id} tenantId=${job.tenantId} type=${job.type} attempt=${job.attempts + 1} durationMs=${Date.now() - startedAt} error=${message}`
      );
      return true;
    }
  }

  private async dispatch(type: JobType, payload: Record<string, unknown>): Promise<void> {
    if (type === JobType.COLLECTIONS_ESCALATION) {
      await this.collectionsHandler.handle(payload);
      return;
    }
    if (type === JobType.ACCRUE_INTEREST || type === JobType.LEDGER_RECONCILE) {
      await this.repaymentHandler.handle(payload);
      return;
    }
    if (type === JobType.RECALC_BALANCES || type === JobType.RISK_REEVALUATION) {
      await this.disbursementHandler.handle(payload);
      return;
    }
  }
}

