import { Injectable, Logger } from '@nestjs/common';
import { JobType } from '@prisma/client';
import { JobsService } from './jobs.service';

@Injectable()
export class JobsSchedulerService {
  private readonly logger = new Logger(JobsSchedulerService.name);

  constructor(private readonly jobsService: JobsService) {}

  async scheduleDaily(referenceDate = new Date()): Promise<void> {
    const day = this.dayKey(referenceDate);
    const runAt = this.twoAmUtc(referenceDate);

    await this.jobsService.createJob({
      type: JobType.LEDGER_RECONCILE,
      key: `ledgerReconcile:daily:${day}`,
      payload: { day, date: `${day}T00:00:00.000Z` },
      runAt
    });

    await this.jobsService.createJob({
      type: JobType.ACCRUE_INTEREST,
      key: `accrueInterest:daily:${day}`,
      payload: { day, asOfDate: `${day}T00:00:00.000Z` },
      runAt
    });

    await this.jobsService.createJob({
      type: JobType.RISK_REEVALUATION,
      key: `riskReevaluation:daily:${day}`,
      payload: { day },
      runAt
    });

    this.logger.log(`Scheduled daily jobs for ${day} runAt=${runAt.toISOString()}`);
  }

  private dayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private twoAmUtc(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 2, 0, 0, 0));
  }
}
