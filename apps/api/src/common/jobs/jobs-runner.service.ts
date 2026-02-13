import { Injectable, Logger } from '@nestjs/common';
import { JobType, LoanStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PenaltyService } from '../../modules/admin-loans/penalty.service';
import { AdminReportsService } from '../../modules/admin-reports/admin-reports.service';
import { OverdueService } from '../../modules/loans/overdue.service';
import { JobsService } from './jobs.service';

@Injectable()
export class JobsRunnerService {
  private readonly logger = new Logger(JobsRunnerService.name);
  private readonly lockTtlSec = 120;

  constructor(
    private readonly jobsService: JobsService,
    private readonly overdueService: OverdueService,
    private readonly penaltyService: PenaltyService,
    private readonly adminReportsService: AdminReportsService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  async runLoop(pollMs = 3000): Promise<void> {
    this.logger.log(`Job runner started with poll interval ${pollMs}ms`);
    while (true) {
      await this.processOnce();
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }

  async processOnce(): Promise<boolean> {
    const job = await this.jobsService.claimNextJob();
    if (!job) {
      return false;
    }

    const lockKey = `jobs:lock:${job.id}`;
    const locked = await this.redisService.setIfNotExists(lockKey, '1', this.lockTtlSec);
    if (!locked) {
      await this.jobsService.releaseClaim(job.id);
      return true;
    }

    try {
      this.logger.log(
        `Job processing start jobId=${job.id} type=${job.type} key=${job.key} attempt=${job.attempts + 1}/${job.maxAttempts}`
      );
      await this.handleJob(job.type, job.payload);
      await this.jobsService.markCompleted(job.id);
      this.logger.log(
        `Job processing success jobId=${job.id} type=${job.type} key=${job.key} attempt=${job.attempts + 1}/${job.maxAttempts}`
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown job error';
      await this.jobsService.markFailed(job.id, job.attempts, job.maxAttempts, message);

      const failedAttempts = job.attempts + 1;
      if (failedAttempts >= job.maxAttempts) {
        await this.logDeadLetterAudit(job.id, job.type, failedAttempts, job.maxAttempts, message);
      }
      this.logger.error(
        `Job processing failure jobId=${job.id} type=${job.type} key=${job.key} attempt=${failedAttempts}/${job.maxAttempts} error=${message}`
      );
      return true;
    } finally {
      await this.redisService.delete(lockKey);
    }
  }

  private async handleJob(type: JobType, payload: unknown): Promise<void> {
    switch (type) {
      case JobType.OVERDUE_SCAN:
        await this.handleOverdueScan(payload);
        return;
      case JobType.PENALTY_ACCRUAL_DAILY:
        await this.handlePenaltyAccrualDaily(payload);
        return;
      case JobType.DAILY_AGGREGATE_BUILD:
        await this.handleDailyAggregateBuild(payload);
        return;
      default:
        throw new Error(`Unsupported job type: ${type}`);
    }
  }

  private async handleOverdueScan(payload: unknown): Promise<void> {
    const loanId = this.readLoanId(payload);
    if (loanId) {
      await this.overdueService.reconcileLoanStatus(loanId);
      return;
    }

    const loans = await this.prisma.loan.findMany({
      where: {
        status: {
          in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE]
        }
      },
      select: { id: true }
    });

    for (const loan of loans) {
      await this.overdueService.reconcileLoanStatus(loan.id);
    }
  }

  private async handlePenaltyAccrualDaily(payload: unknown): Promise<void> {
    const accrualDate = this.readAccrualDate(payload);
    const loans = await this.prisma.loan.findMany({
      where: { status: LoanStatus.OVERDUE },
      select: { id: true }
    });

    for (const loan of loans) {
      await this.penaltyService.accrueDailyPenalty(loan.id, accrualDate);
    }
  }

  private async handleDailyAggregateBuild(payload: unknown): Promise<void> {
    const targetDate = this.readTargetDate(payload);
    await this.adminReportsService.buildDailyAggregateForDate(targetDate);
  }

  private readLoanId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const value = (payload as { loanId?: unknown }).loanId;
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private readAccrualDate(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    const value = (payload as { accrualDate?: unknown }).accrualDate;
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed || undefined;
  }

  private readTargetDate(payload: unknown): Date {
    if (!payload || typeof payload !== 'object') {
      return this.defaultAggregateDate();
    }

    const value = (payload as { targetDate?: unknown }).targetDate;
    if (typeof value !== 'string') {
      return this.defaultAggregateDate();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return this.defaultAggregateDate();
    }

    return parsed;
  }

  private defaultAggregateDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0));
  }

  private async logDeadLetterAudit(
    jobId: string,
    type: JobType,
    attempts: number,
    maxAttempts: number,
    error: string
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          event: 'JOB_DEAD_LETTERED',
          actorType: 'SYSTEM',
          actorId: null,
          metadata: {
            entityType: 'JOB',
            entityId: jobId,
            type,
            attempts,
            maxAttempts,
            error
          }
        }
      });
    } catch (auditError) {
      const message = auditError instanceof Error ? auditError.message : 'Unknown audit log failure';
      this.logger.error(`Failed to write dead-letter audit for job ${jobId}: ${message}`);
    }
  }
}
