import { Logger } from '@nestjs/common';
import type { Job, JobType } from '@prisma/client';

type AccrueInterestPayload = {
  loanId: string;
  asOfDate: string;
};

type RecalcBalancesPayload = {
  loanId: string;
};

type LedgerReconcilePayload = {
  tenantId: string;
  date: string;
};

type MandateDebitPayload = {
  mandateId: string;
};

export type JobHandlerContext = {
  logger: Logger;
  processWebhookEvent?: (webhookEventId: string) => Promise<void>;
  processMandateDebit?: (mandateId: string) => Promise<void>;
};

export type JobHandler = (job: Job, context: JobHandlerContext) => Promise<void>;

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function requireString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid payload.${key}`);
  }
  return value.trim();
}

const accrueInterestHandler: JobHandler = async (job, context) => {
  const payload = asObject(job.payload);
  const parsed: AccrueInterestPayload = {
    loanId: requireString(payload, 'loanId'),
    asOfDate: requireString(payload, 'asOfDate')
  };
  context.logger.log(`ACCRUE_INTEREST accepted job=${job.id} loanId=${parsed.loanId} asOfDate=${parsed.asOfDate}`);
};

const recalcBalancesHandler: JobHandler = async (job, context) => {
  const payload = asObject(job.payload);
  const parsed: RecalcBalancesPayload = {
    loanId: requireString(payload, 'loanId')
  };
  context.logger.log(`RECALC_BALANCES accepted job=${job.id} loanId=${parsed.loanId}`);
};

const ledgerReconcileHandler: JobHandler = async (job, context) => {
  const payload = asObject(job.payload);
  const parsed: LedgerReconcilePayload = {
    tenantId: requireString(payload, 'tenantId'),
    date: requireString(payload, 'date')
  };
  context.logger.log(`LEDGER_RECONCILE accepted job=${job.id} tenantId=${parsed.tenantId} date=${parsed.date}`);
};

const noopHandler: JobHandler = async (job, context) => {
  context.logger.log(`Stub handler accepted job=${job.id} type=${job.type}`);
};

const processWebhookEventHandler: JobHandler = async (job, context) => {
  const payload = asObject(job.payload);
  const webhookEventId = requireString(payload, 'webhookEventId');
  if (!context.processWebhookEvent) {
    throw new Error('Webhook processor is not configured in worker context');
  }
  await context.processWebhookEvent(webhookEventId);
  context.logger.log(`PROCESS_WEBHOOK_EVENT accepted job=${job.id} webhookEventId=${webhookEventId}`);
};

const mandateDebitHandler: JobHandler = async (job, context) => {
  const payload = asObject(job.payload);
  const parsed: MandateDebitPayload = {
    mandateId: requireString(payload, 'mandateId')
  };
  if (!context.processMandateDebit) {
    throw new Error('Mandate debit processor is not configured in worker context');
  }
  await context.processMandateDebit(parsed.mandateId);
  context.logger.log(`MANDATE_DEBIT accepted job=${job.id} mandateId=${parsed.mandateId}`);
};

export const JOB_HANDLERS: Record<JobType, JobHandler> = {
  ACCRUE_INTEREST: accrueInterestHandler,
  RECALC_BALANCES: recalcBalancesHandler,
  SEND_NOTIFICATION: noopHandler,
  COLLECTIONS_ESCALATION: noopHandler,
  RISK_REEVALUATION: noopHandler,
  LEDGER_RECONCILE: ledgerReconcileHandler,
  INTEGRITY_SCAN: noopHandler,
  PROCESS_WEBHOOK_EVENT: processWebhookEventHandler,
  MANDATE_DEBIT: mandateDebitHandler
};
