import { Injectable, Logger } from '@nestjs/common';
import { JobType } from '@prisma/client';
import { JobQueueService } from './job-queue.service';

@Injectable()
export class JobsRunnerService {
  private readonly logger = new Logger(JobsRunnerService.name);
  private readonly workerId = process.env.WORKER_ID?.trim() || 'legacy-runner';

  constructor(private readonly jobQueueService: JobQueueService) {}

  async runLoop(pollMs = 3000): Promise<void> {
    this.logger.log(`Job runner started with poll interval ${pollMs}ms`);
    while (true) {
      await this.processOnce();
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }

  async processOnce(): Promise<boolean> {
    const job = await this.jobQueueService.claimNextJob({ workerId: this.workerId });
    if (!job) {
      return false;
    }
    const startedAt = Date.now();
    this.logger.log(
      `job_started jobId=${job.id} tenantId=${job.tenantId} type=${job.type} attempt=${job.attempts + 1}`
    );

    try {
      await this.handleJob(job.type, job.payload as Record<string, unknown>);
      await this.jobQueueService.markSucceeded(job.id, this.workerId);
      this.logger.log(
        `job_succeeded jobId=${job.id} tenantId=${job.tenantId} type=${job.type} attempt=${job.attempts + 1} durationMs=${Date.now() - startedAt}`
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown job error';
      await this.jobQueueService.markFailed(job.id, this.workerId, message);
      this.logger.error(
        `job_failed jobId=${job.id} tenantId=${job.tenantId} type=${job.type} attempt=${job.attempts + 1} durationMs=${Date.now() - startedAt} error=${message}`
      );
      return true;
    }
  }

  private async handleJob(type: JobType, payload: Record<string, unknown>): Promise<void> {
    switch (type) {
      case JobType.ACCRUE_INTEREST:
        this.requirePayloadKeys(type, payload, ['loanId', 'asOfDate']);
        return;
      case JobType.RECALC_BALANCES:
        this.requirePayloadKeys(type, payload, ['loanId']);
        return;
      case JobType.SEND_NOTIFICATION:
      case JobType.COLLECTIONS_ESCALATION:
      case JobType.RISK_REEVALUATION:
      case JobType.LEDGER_RECONCILE:
      case JobType.INTEGRITY_SCAN:
      case JobType.PROCESS_WEBHOOK_EVENT:
      case JobType.MANDATE_DEBIT:
        return;
      default:
        throw new Error(`Unsupported job type ${type}`);
    }
  }

  private requirePayloadKeys(type: JobType, payload: Record<string, unknown>, required: string[]): void {
    for (const key of required) {
      if (!(key in payload)) {
        throw new Error(`Missing payload field for ${type}: ${key}`);
      }
    }
  }
}
