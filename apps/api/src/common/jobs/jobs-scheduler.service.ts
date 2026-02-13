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
    const targetDay = this.previousDayKey(referenceDate);
    const targetDate = `${targetDay}T00:00:00.000Z`;

    await this.jobsService.createJob({
      type: JobType.OVERDUE_SCAN,
      key: `overdue_scan:${day}`,
      payload: { day },
      runAt
    });

    await this.jobsService.createJob({
      type: JobType.PENALTY_ACCRUAL_DAILY,
      key: `penalty_accrual:${day}`,
      payload: {
        day,
        accrualDate: `${day}T00:00:00.000Z`
      },
      runAt
    });

    await this.jobsService.createJob({
      type: JobType.DAILY_AGGREGATE_BUILD,
      key: `daily_aggregate:${targetDay}`,
      payload: {
        day: targetDay,
        targetDate
      },
      runAt
    });

    this.logger.log(`Scheduled daily jobs for ${day}, aggregate target=${targetDay} runAt=${runAt.toISOString()}`);
  }

  private dayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private previousDayKey(date: Date): string {
    const previous = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1, 0, 0, 0, 0));
    return previous.toISOString().slice(0, 10);
  }

  private twoAmUtc(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 2, 0, 0, 0));
  }
}
