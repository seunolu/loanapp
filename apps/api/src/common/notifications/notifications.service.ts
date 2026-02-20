import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationAudienceType,
  NotificationDeliveryChannel,
  NotificationOutboxStatus,
  NotificationRecordStatus,
  NotificationStatus,
  Prisma
} from '@prisma/client';
import type { BorrowerPrincipal } from '../auth/borrower-principal';
import type { TenantAdminPrincipal } from '../auth/tenant-admin-principal';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../database/prisma.service';

type SmsPayload = {
  event: string;
  recipient: string;
  message: string;
  metadata?: unknown;
};

type NotificationTx = Prisma.TransactionClient | PrismaService;

export type NotificationPrincipal =
  | { type: 'BORROWER'; principal: BorrowerPrincipal }
  | { type: 'ADMIN'; principal: TenantAdminPrincipal };

export type CreateNotificationInput = {
  tenantId: string;
  audienceType: NotificationAudienceType;
  audienceUserId: string;
  channel: NotificationDeliveryChannel;
  templateKey: string;
  title: string;
  body: string;
  dataJson?: Prisma.InputJsonValue;
  idempotencyKey: string;
};

export type ListNotificationsInput = {
  limit?: number;
  offset?: number;
  status?: NotificationRecordStatus;
};

export type NotificationListItem = {
  id: string;
  audienceType: NotificationAudienceType;
  audienceUserId: string;
  channel: NotificationDeliveryChannel;
  templateKey: string;
  title: string;
  body: string;
  dataJson: Prisma.JsonValue;
  status: NotificationRecordStatus;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>
  ) {}

  async createNotification(
    input: CreateNotificationInput,
    tx?: Prisma.TransactionClient
  ): Promise<{ notificationId: string; reused: boolean }> {
    const db = tx ?? this.prisma;
    const payload = {
      tenantId: input.tenantId,
      audienceType: input.audienceType,
      audienceUserId: input.audienceUserId,
      channel: input.channel,
      templateKey: input.templateKey,
      title: input.title.trim(),
      body: input.body.trim(),
      dataJson: (input.dataJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      status: NotificationRecordStatus.QUEUED,
      idempotencyKey: input.idempotencyKey.trim()
    };

    if (!payload.idempotencyKey) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'idempotencyKey is required.',
        details: null
      });
    }

    const existing = await db.notification.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId: payload.tenantId,
          idempotencyKey: payload.idempotencyKey
        }
      },
      select: { id: true }
    });
    if (existing) {
      return { notificationId: existing.id, reused: true };
    }

    const created = await db.notification.create({
      data: payload,
      select: { id: true }
    });
    await this.enqueueOutbox(payload.tenantId, created.id, db);
    return { notificationId: created.id, reused: false };
  }

  async enqueueOutbox(
    tenantId: string,
    notificationId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx ?? this.prisma;
    await db.notificationOutbox.upsert({
      where: { notificationId },
      create: {
        tenantId,
        notificationId,
        status: NotificationOutboxStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date()
      },
      update: {
        status: NotificationOutboxStatus.PENDING,
        nextAttemptAt: new Date()
      }
    });
  }

  async listNotifications(
    principal: NotificationPrincipal,
    filters: ListNotificationsInput
  ): Promise<{ items: NotificationListItem[]; total: number }> {
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    const offset = Math.max(filters.offset ?? 0, 0);
    const where: Prisma.NotificationWhereInput =
      principal.type === 'ADMIN'
        ? {
            tenantId: principal.principal.tenantId,
            audienceType: NotificationAudienceType.ADMIN,
            audienceUserId: principal.principal.adminId,
            ...(filters.status ? { status: filters.status } : {})
          }
        : {
            tenantId: principal.principal.tenantId,
            audienceType: NotificationAudienceType.BORROWER,
            audienceUserId: { in: [principal.principal.borrowerId, principal.principal.phone] },
            ...(filters.status ? { status: filters.status } : {})
          };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      this.prisma.notification.count({ where })
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        audienceType: row.audienceType,
        audienceUserId: row.audienceUserId,
        channel: row.channel,
        templateKey: row.templateKey,
        title: row.title,
        body: row.body,
        dataJson: row.dataJson as Prisma.JsonValue,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        readAt: row.readAt ? row.readAt.toISOString() : null
      }))
    };
  }

  async markAsRead(notificationId: string, principal: NotificationPrincipal): Promise<{ id: string; status: NotificationRecordStatus }> {
    const whereAudience =
      principal.type === 'ADMIN'
        ? {
            audienceType: NotificationAudienceType.ADMIN,
            audienceUserId: principal.principal.adminId,
            tenantId: principal.principal.tenantId
          }
        : {
            audienceType: NotificationAudienceType.BORROWER,
            audienceUserId: { in: [principal.principal.borrowerId, principal.principal.phone] },
            tenantId: principal.principal.tenantId
          };

    const row = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        ...whereAudience
      },
      select: { id: true, status: true }
    });
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Notification not found.',
        details: { id: notificationId }
      });
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationRecordStatus.READ,
        readAt: new Date()
      },
      select: { id: true, status: true }
    });
    return updated;
  }

  async processOutboxBatch(limit = 25): Promise<{ processed: number; failed: number }> {
    const now = new Date();
    const rows = await this.prisma.notificationOutbox.findMany({
      where: {
        status: { in: [NotificationOutboxStatus.PENDING, NotificationOutboxStatus.FAILED] },
        nextAttemptAt: { lte: now }
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { notification: true }
    });

    let processed = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const locked = await tx.notificationOutbox.findFirst({
            where: {
              id: row.id,
              status: { in: [NotificationOutboxStatus.PENDING, NotificationOutboxStatus.FAILED] }
            },
            select: { id: true, attempts: true }
          });
          if (!locked) {
            return;
          }

          await tx.notificationOutbox.update({
            where: { id: row.id },
            data: { status: NotificationOutboxStatus.PROCESSING }
          });

          // Stub delivery; real providers will plug in here.
          this.logger.log(
            `notification.send requestId=system tenantId=${row.tenantId} notificationId=${row.notificationId} channel=${row.notification.channel} audience=${row.notification.audienceType}:${row.notification.audienceUserId}`
          );

          await tx.notification.update({
            where: { id: row.notificationId },
            data: { status: NotificationRecordStatus.SENT }
          });
          await tx.notificationOutbox.update({
            where: { id: row.id },
            data: {
              status: NotificationOutboxStatus.DONE,
              attempts: { increment: 1 },
              lastError: null
            }
          });
        });
        processed += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : 'Notification outbox send failed';
        const backoffMinutes = Math.min(60, (row.attempts + 1) * 2);
        await this.prisma.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: NotificationOutboxStatus.FAILED,
            attempts: { increment: 1 },
            lastError: message,
            nextAttemptAt: new Date(now.getTime() + backoffMinutes * 60_000)
          }
        });
      }
    }

    return { processed, failed };
  }

  async publishLoanStatusChanged(input: {
    tenantId: string;
    loanApplicationId: string;
    fromStatus: string | null;
    toStatus: string;
    historyId: string;
    borrowerAudienceUserId?: string | null;
    adminAudienceUserIds?: string[];
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const commonData = {
      loanApplicationId: input.loanApplicationId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      historyId: input.historyId
    } as Prisma.InputJsonValue;
    if (input.borrowerAudienceUserId) {
      await this.createNotification({
        tenantId: input.tenantId,
        audienceType: NotificationAudienceType.BORROWER,
        audienceUserId: input.borrowerAudienceUserId,
        channel: NotificationDeliveryChannel.IN_APP,
        templateKey: 'LOAN_STATUS_CHANGED',
        title: 'Loan status updated',
        body: `Your loan application status changed to ${input.toStatus}.`,
        dataJson: commonData,
        idempotencyKey: `loan:${input.loanApplicationId}:transition:${input.fromStatus ?? 'null'}->${input.toStatus}:${input.historyId}:borrower`
      }, input.tx);
    }
    for (const adminUserId of input.adminAudienceUserIds ?? []) {
      await this.createNotification({
        tenantId: input.tenantId,
        audienceType: NotificationAudienceType.ADMIN,
        audienceUserId: adminUserId,
        channel: NotificationDeliveryChannel.IN_APP,
        templateKey: 'LOAN_STATUS_CHANGED',
        title: 'Loan status changed',
        body: `Loan ${input.loanApplicationId} changed from ${input.fromStatus ?? 'N/A'} to ${input.toStatus}.`,
        dataJson: commonData,
        idempotencyKey: `loan:${input.loanApplicationId}:transition:${input.fromStatus ?? 'null'}->${input.toStatus}:${input.historyId}:admin:${adminUserId}`
      }, input.tx);
    }
  }

  async publishRepaymentPosted(input: {
    tenantId: string;
    repaymentId: string;
    loanApplicationId: string;
    borrowerAudienceUserId?: string | null;
    adminAudienceUserIds?: string[];
    amount: string;
    currency: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const data = {
      repaymentId: input.repaymentId,
      loanApplicationId: input.loanApplicationId,
      amount: input.amount,
      currency: input.currency
    } as Prisma.InputJsonValue;
    if (input.borrowerAudienceUserId) {
      await this.createNotification({
        tenantId: input.tenantId,
        audienceType: NotificationAudienceType.BORROWER,
        audienceUserId: input.borrowerAudienceUserId,
        channel: NotificationDeliveryChannel.IN_APP,
        templateKey: 'REPAYMENT_RECEIVED',
        title: 'Repayment received',
        body: `We received your repayment of ${input.amount} ${input.currency}.`,
        dataJson: data,
        idempotencyKey: `repayment:${input.repaymentId}:borrower`
      }, input.tx);
    }
    for (const adminUserId of input.adminAudienceUserIds ?? []) {
      await this.createNotification({
        tenantId: input.tenantId,
        audienceType: NotificationAudienceType.ADMIN,
        audienceUserId: adminUserId,
        channel: NotificationDeliveryChannel.IN_APP,
        templateKey: 'REPAYMENT_RECEIVED_ADMIN',
        title: 'Repayment posted',
        body: `Repayment ${input.repaymentId} posted for loan ${input.loanApplicationId}.`,
        dataJson: data,
        idempotencyKey: `repayment:${input.repaymentId}:admin:${adminUserId}`
      }, input.tx);
    }
  }

  async publishDisbursed(input: {
    tenantId: string;
    disbursementId: string;
    loanApplicationId: string;
    borrowerAudienceUserId?: string | null;
    adminAudienceUserIds?: string[];
    amount: string;
    currency: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const data = {
      disbursementId: input.disbursementId,
      loanApplicationId: input.loanApplicationId,
      amount: input.amount,
      currency: input.currency
    } as Prisma.InputJsonValue;
    if (input.borrowerAudienceUserId) {
      await this.createNotification({
        tenantId: input.tenantId,
        audienceType: NotificationAudienceType.BORROWER,
        audienceUserId: input.borrowerAudienceUserId,
        channel: NotificationDeliveryChannel.IN_APP,
        templateKey: 'DISBURSED',
        title: 'Loan disbursed',
        body: `Your loan of ${input.amount} ${input.currency} has been disbursed.`,
        dataJson: data,
        idempotencyKey: `disbursement:${input.disbursementId}:borrower`
      }, input.tx);
    }
    for (const adminUserId of input.adminAudienceUserIds ?? []) {
      await this.createNotification({
        tenantId: input.tenantId,
        audienceType: NotificationAudienceType.ADMIN,
        audienceUserId: adminUserId,
        channel: NotificationDeliveryChannel.IN_APP,
        templateKey: 'DISBURSED_ADMIN',
        title: 'Disbursement succeeded',
        body: `Disbursement ${input.disbursementId} succeeded for loan ${input.loanApplicationId}.`,
        dataJson: data,
        idempotencyKey: `disbursement:${input.disbursementId}:admin:${adminUserId}`
      }, input.tx);
    }
  }

  // Legacy SMS helpers kept for backward compatibility.
  async sendOtpRequested(phone: string, otpRef: string, expiresInSec: number): Promise<void> {
    const appName = this.configService.get('APP_PUBLIC_NAME', { infer: true });
    const supportPhone = this.configService.get('APP_PUBLIC_SUPPORT_PHONE', { infer: true });
    const message = `${appName}: OTP requested. Ref ${otpRef}. Expires in ${expiresInSec}s. Need help? ${supportPhone}`;
    await this.sendSms({
      event: 'OTP_REQUESTED',
      recipient: phone,
      message,
      metadata: { otpRef, expiresInSec }
    });
  }

  async sendDisbursementSucceeded(phone: string, loanId: string, amountKobo: number): Promise<void> {
    const appName = this.configService.get('APP_PUBLIC_NAME', { infer: true });
    const message = `${appName}: Your loan disbursement was successful. Loan ${loanId}, amount ${amountKobo} kobo.`;
    await this.sendSms({
      event: 'DISBURSEMENT_SUCCEEDED',
      recipient: phone,
      message,
      metadata: { loanId, amountKobo }
    });
  }

  async sendRepaymentSuccess(phone: string, loanId: string, amountKobo: number): Promise<void> {
    const appName = this.configService.get('APP_PUBLIC_NAME', { infer: true });
    const message = `${appName}: Repayment received for loan ${loanId}. Amount ${amountKobo} kobo.`;
    await this.sendSms({
      event: 'REPAYMENT_SUCCESS',
      recipient: phone,
      message,
      metadata: { loanId, amountKobo }
    });
  }

  async sendOverdueReminder(phone: string, loanId: string): Promise<void> {
    const appName = this.configService.get('APP_PUBLIC_NAME', { infer: true });
    const supportPhone = this.configService.get('APP_PUBLIC_SUPPORT_PHONE', { infer: true });
    const message = `${appName}: Loan ${loanId} is overdue. Please make payment. Support: ${supportPhone}`;
    await this.sendSms({
      event: 'OVERDUE_REMINDER',
      recipient: phone,
      message,
      metadata: { loanId }
    });
  }

  private async sendSms(payload: SmsPayload): Promise<void> {
    const provider = this.configService.get('SMS_PROVIDER', { infer: true });
    const enabled = this.configService.get('NOTIFICATIONS_ENABLED', { infer: true });
    const metadata = this.toJson(payload.metadata);

    if (!enabled) {
      await this.safeLog({
        event: payload.event,
        channel: 'SMS',
        provider,
        recipient: payload.recipient,
        message: payload.message,
        status: NotificationStatus.SKIPPED,
        error: null,
        metadata
      });
      return;
    }

    try {
      if (provider === 'DEV_SINK') {
        this.logger.log(`[DEV_SINK SMS] to=${payload.recipient} event=${payload.event} message="${payload.message}"`);
      }

      await this.safeLog({
        event: payload.event,
        channel: 'SMS',
        provider,
        recipient: payload.recipient,
        message: payload.message,
        status: NotificationStatus.SENT,
        error: null,
        metadata
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Notification send failed';

      await this.safeLog({
        event: payload.event,
        channel: 'SMS',
        provider,
        recipient: payload.recipient,
        message: payload.message,
        status: NotificationStatus.FAILED,
        error: errorMessage,
        metadata
      });
    }
  }

  private async safeLog(input: {
    event: string;
    channel: 'SMS' | 'EMAIL';
    provider: string;
    recipient: string;
    message: string;
    status: NotificationStatus;
    error: string | null;
    metadata: Prisma.InputJsonValue | null;
  }): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          event: input.event,
          channel: input.channel,
          provider: input.provider,
          recipient: input.recipient,
          message: input.message,
          status: input.status,
          error: input.error,
          metadata: input.metadata ?? Prisma.JsonNull
        }
      });
    } catch (logError) {
      const message = logError instanceof Error ? logError.message : 'Failed to write notification log';
      this.logger.error(`Notification logging failed: ${message}`);
    }
  }

  private toJson(value: unknown): Prisma.InputJsonValue | null {
    if (value === undefined || value === null) {
      return null;
    }
    return value as Prisma.InputJsonValue;
  }
}
