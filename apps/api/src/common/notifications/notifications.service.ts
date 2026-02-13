import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../database/prisma.service';

type SmsPayload = {
  event: string;
  recipient: string;
  message: string;
  metadata?: unknown;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>
  ) {}

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
        channel: NotificationChannel.SMS,
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
        channel: NotificationChannel.SMS,
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
        channel: NotificationChannel.SMS,
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
    channel: NotificationChannel;
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
