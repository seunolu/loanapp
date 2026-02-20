import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsEventPublisher {
  constructor(private readonly notificationsService: NotificationsService) {}

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
    await this.notificationsService.publishLoanStatusChanged(input);
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
    await this.notificationsService.publishRepaymentPosted(input);
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
    await this.notificationsService.publishDisbursed(input);
  }
}
