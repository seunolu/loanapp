import { Injectable } from '@nestjs/common';
import { redactForLogs } from '../logging/redact';
import { AuditService } from './audit.service';

export type AuditEventName =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAIL'
  | 'AUTH_REFRESH_SUCCESS'
  | 'AUTH_REFRESH_FAIL'
  | 'AUTH_LOGOUT'
  | 'KYC_UPDATE'
  | 'LOAN_APPLY'
  | 'LOAN_DECISION'
  | 'PAYMENT_INTENT_CREATED'
  | 'PAYMENT_RECONCILIATION';

type AuditActorType = 'BORROWER' | 'TENANT_ADMIN' | 'ADMIN' | 'SYSTEM';

type AuditLogInput = {
  event: AuditEventName;
  tenantId?: string | null;
  actorType: AuditActorType;
  actorId?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  metadata?: Record<string, unknown>;
  status?: 'SUCCESS' | 'FAIL';
};

@Injectable()
export class AuditLoggerService {
  constructor(private readonly auditService: AuditService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.auditService.write({
      event: input.event,
      action: input.event,
      tenantId: input.tenantId ?? null,
      requestId: input.requestId ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      status: input.status ?? 'SUCCESS',
      metadata: {
        ...(redactForLogs(input.metadata) as Record<string, unknown> | undefined),
        deviceId: input.deviceId ?? null
      }
    });
  }
}
