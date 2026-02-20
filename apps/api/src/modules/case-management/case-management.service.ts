import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CasePriority,
  CaseResolutionCode,
  CaseStatus,
  CaseType,
  NotificationAudienceType,
  NotificationDeliveryChannel,
  Prisma,
  TenantAdminRole
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationsService } from '../../common/notifications/notifications.service';

const RESOLVED_LIKE_STATUSES: CaseStatus[] = ['RESOLVED', 'REJECTED', 'CLOSED'];
const BORROWER_MESSAGE_ALLOWED_STATUSES: CaseStatus[] = ['OPEN', 'IN_REVIEW', 'AWAITING_BORROWER', 'ESCALATED'];

const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  OPEN: ['IN_REVIEW', 'ESCALATED', 'REJECTED'],
  IN_REVIEW: ['AWAITING_BORROWER', 'ESCALATED', 'RESOLVED', 'REJECTED'],
  AWAITING_BORROWER: ['IN_REVIEW', 'ESCALATED', 'RESOLVED'],
  ESCALATED: ['IN_REVIEW', 'RESOLVED'],
  RESOLVED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: []
};

export function computeCaseSlaDueAt(priority: CasePriority, now: Date): Date {
  const due = new Date(now);
  if (priority === 'LOW') due.setUTCDate(due.getUTCDate() + 7);
  if (priority === 'MEDIUM') due.setUTCDate(due.getUTCDate() + 3);
  if (priority === 'HIGH') due.setUTCHours(due.getUTCHours() + 24);
  if (priority === 'URGENT') due.setUTCHours(due.getUTCHours() + 6);
  return due;
}

export function canTransitionCase(from: CaseStatus, to: CaseStatus): boolean {
  return CASE_TRANSITIONS[from]?.includes(to) ?? false;
}

@Injectable()
export class CaseManagementService {
  private readonly logger = new Logger(CaseManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  private assertRole(
    role: TenantAdminRole,
    allowed: TenantAdminRole[],
    message = 'Role cannot perform this action.'
  ): void {
    if (!allowed.includes(role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message, details: { role } });
    }
  }

  private assertTransitionRole(role: TenantAdminRole, toStatus: CaseStatus): void {
    if (role === 'SUPER_ADMIN') return;
    if (role === 'CREDIT_OFFICER') {
      if (toStatus === 'CLOSED') {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'CREDIT_OFFICER cannot transition case to CLOSED.',
          details: null
        });
      }
      return;
    }
    if (role === 'OPS') {
      if (toStatus !== 'CLOSED') {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'OPS can only transition case to CLOSED.',
          details: null
        });
      }
      return;
    }
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: `Role ${role} cannot transition case.`,
      details: null
    });
  }

  private async notifyAssignment(input: {
    tx: Prisma.TransactionClient;
    tenantId: string;
    caseId: string;
    assignedToAdminUserId: string;
    assignedByAdminUserId?: string;
  }): Promise<void> {
    await this.notificationsService.createNotification(
      {
        tenantId: input.tenantId,
        audienceType: NotificationAudienceType.ADMIN,
        audienceUserId: input.assignedToAdminUserId,
        channel: NotificationDeliveryChannel.IN_APP,
        templateKey: 'CASE_ASSIGNED',
        title: 'Case assigned',
        body: `You have been assigned case ${input.caseId}.`,
        dataJson: {
          caseId: input.caseId,
          assignedByAdminUserId: input.assignedByAdminUserId ?? null
        },
        idempotencyKey: `case:${input.caseId}:assigned:${input.assignedToAdminUserId}`
      },
      input.tx
    );
  }

  async createCase(principal: TenantAdminPrincipal, input: {
    borrowerId?: string;
    loanApplicationId?: string;
    repaymentId?: string;
    disbursementId?: string;
    type: CaseType;
    priority: CasePriority;
    subject: string;
    description: string;
    assignedToAdminUserId?: string;
  }) {
    this.assertRole(principal.role, ['CREDIT_OFFICER', 'OPS', 'SUPER_ADMIN'], 'Role cannot create cases.');
    const now = new Date();
    const slaDueAt = computeCaseSlaDueAt(input.priority, now);
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.case.create({
        data: {
          tenantId: principal.tenantId,
          borrowerId: input.borrowerId ?? null,
          loanApplicationId: input.loanApplicationId ?? null,
          repaymentId: input.repaymentId ?? null,
          disbursementId: input.disbursementId ?? null,
          type: input.type,
          status: 'OPEN',
          priority: input.priority,
          subject: input.subject.trim(),
          description: input.description.trim(),
          assignedToAdminUserId: input.assignedToAdminUserId ?? null,
          slaDueAt,
          createdByAdminUserId: principal.adminId
        }
      });
      await tx.caseStatusHistory.create({
        data: {
          tenantId: principal.tenantId,
          caseId: row.id,
          fromStatus: null,
          toStatus: 'OPEN',
          changedByAdminUserId: principal.adminId,
          reason: 'Case created'
        }
      });
      if (row.assignedToAdminUserId) {
        await this.notifyAssignment({
          tx,
          tenantId: principal.tenantId,
          caseId: row.id,
          assignedToAdminUserId: row.assignedToAdminUserId,
          assignedByAdminUserId: principal.adminId
        });
      }
      await this.auditService.log({
        tx,
        tenantId: principal.tenantId,
        actorType: 'TENANT_ADMIN',
        actorId: principal.adminId,
        actorRole: principal.role,
        action: 'CASE_CREATED',
        entity: 'CASE',
        entityId: row.id,
        metadata: {
          type: row.type,
          priority: row.priority,
          loanApplicationId: row.loanApplicationId,
          repaymentId: row.repaymentId,
          disbursementId: row.disbursementId
        }
      });
      return row;
    });
    return created;
  }

  async listCases(principal: TenantAdminPrincipal, query: {
    status?: CaseStatus;
    priority?: CasePriority;
    assignedToAdminUserId?: string;
    borrowerId?: string;
    loanApplicationId?: string;
    overdueOnly?: boolean;
    page: number;
    pageSize: number;
  }) {
    this.assertRole(principal.role, ['CREDIT_OFFICER', 'OPS', 'SUPER_ADMIN'], 'Role cannot list cases.');
    const where: Prisma.CaseWhereInput = {
      tenantId: principal.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assignedToAdminUserId ? { assignedToAdminUserId: query.assignedToAdminUserId } : {}),
      ...(query.borrowerId ? { borrowerId: query.borrowerId } : {}),
      ...(query.loanApplicationId ? { loanApplicationId: query.loanApplicationId } : {}),
      ...(query.overdueOnly
        ? {
            slaDueAt: { lt: new Date() },
            status: { notIn: ['RESOLVED', 'CLOSED'] }
          }
        : {})
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.case.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: query.pageSize
      }),
      this.prisma.case.count({ where })
    ]);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize))
    };
  }

  async getCase(principal: TenantAdminPrincipal, caseId: string) {
    this.assertRole(principal.role, ['CREDIT_OFFICER', 'OPS', 'SUPER_ADMIN'], 'Role cannot read cases.');
    const row = await this.prisma.case.findFirst({
      where: { id: caseId, tenantId: principal.tenantId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        history: { orderBy: { createdAt: 'asc' } }
      }
    });
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Case not found.', details: { caseId } });
    }
    return row;
  }

  private minuteBucket(date: Date): string {
    return date.toISOString().slice(0, 16);
  }

  private async notifyCaseEventForAdmins(input: {
    tx: Prisma.TransactionClient;
    tenantId: string;
    caseId: string;
    assignedToAdminUserId?: string | null;
    templateKey: 'CASE_CREATED_BY_BORROWER' | 'CASE_MESSAGE_FROM_BORROWER';
    title: string;
    body: string;
    dataJson: Prisma.InputJsonValue;
    now: Date;
  }): Promise<void> {
    const recipients =
      input.assignedToAdminUserId
        ? [{ id: input.assignedToAdminUserId }]
        : await input.tx.tenantAdminUser.findMany({
            where: { tenantId: input.tenantId, role: 'CREDIT_OFFICER' },
            select: { id: true }
          });
    const bucket = this.minuteBucket(input.now);
    for (const recipient of recipients) {
      await this.notificationsService.createNotification(
        {
          tenantId: input.tenantId,
          audienceType: NotificationAudienceType.ADMIN,
          audienceUserId: recipient.id,
          channel: NotificationDeliveryChannel.IN_APP,
          templateKey: input.templateKey,
          title: input.title,
          body: input.body,
          dataJson: input.dataJson,
          idempotencyKey: `case:${input.caseId}:${input.templateKey}:${bucket}:${recipient.id}`
        },
        input.tx
      );
    }
  }

  async assertBorrowerOwnsCase(caseId: string, borrowerId: string, tenantId: string) {
    const row = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        tenantId,
        borrowerId
      }
    });
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Case not found.', details: { caseId } });
    }
    return row;
  }

  async listBorrowerCases(
    borrower: BorrowerPrincipal,
    query: {
      status?: CaseStatus;
      page: number;
      limit: number;
    }
  ) {
    const where: Prisma.CaseWhereInput = {
      tenantId: borrower.tenantId,
      borrowerId: borrower.borrowerId,
      ...(query.status ? { status: query.status } : {})
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.case.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: query.limit
      }),
      this.prisma.case.count({ where })
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit))
    };
  }

  async getBorrowerCase(borrower: BorrowerPrincipal, caseId: string) {
    const owned = await this.assertBorrowerOwnsCase(caseId, borrower.borrowerId, borrower.tenantId);
    const row = await this.prisma.case.findFirst({
      where: { id: owned.id },
      include: {
        messages: {
          where: { visibility: 'BORROWER' },
          orderBy: { createdAt: 'asc' }
        },
        history: { orderBy: { createdAt: 'asc' } }
      }
    });
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Case not found.', details: { caseId } });
    }
    return row;
  }

  async createBorrowerCase(
    borrower: BorrowerPrincipal,
    input: {
      type: CaseType;
      subject: string;
      description: string;
      loanApplicationId?: string;
      repaymentId?: string;
      disbursementId?: string;
    }
  ) {
    const now = new Date();
    const slaDueAt = computeCaseSlaDueAt('MEDIUM', now);
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.case.create({
        data: {
          tenantId: borrower.tenantId,
          borrowerId: borrower.borrowerId,
          loanApplicationId: input.loanApplicationId ?? null,
          repaymentId: input.repaymentId ?? null,
          disbursementId: input.disbursementId ?? null,
          type: input.type,
          status: 'OPEN',
          priority: 'MEDIUM',
          subject: input.subject.trim(),
          description: input.description.trim(),
          assignedToAdminUserId: null,
          slaDueAt,
          createdByAdminUserId: null,
          createdByBorrowerId: borrower.borrowerId
        }
      });
      await tx.caseStatusHistory.create({
        data: {
          tenantId: borrower.tenantId,
          caseId: row.id,
          fromStatus: null,
          toStatus: 'OPEN',
          changedByAdminUserId: null,
          changedByBorrowerId: borrower.borrowerId,
          reason: 'Case created by borrower'
        }
      });

      await this.notifyCaseEventForAdmins({
        tx,
        tenantId: borrower.tenantId,
        caseId: row.id,
        assignedToAdminUserId: row.assignedToAdminUserId,
        templateKey: 'CASE_CREATED_BY_BORROWER',
        title: 'New borrower case',
        body: `Borrower opened case ${row.id}: ${row.subject}`,
        dataJson: {
          caseId: row.id,
          borrowerId: row.borrowerId,
          loanApplicationId: row.loanApplicationId
        } as Prisma.InputJsonValue,
        now
      });

      await this.auditService.log({
        tx,
        tenantId: borrower.tenantId,
        actorType: 'BORROWER',
        actorId: borrower.borrowerId,
        actorRole: null,
        action: 'CASE_CREATED_BY_BORROWER',
        entity: 'CASE',
        entityId: row.id,
        metadata: {
          type: row.type,
          priority: row.priority,
          loanApplicationId: row.loanApplicationId,
          repaymentId: row.repaymentId,
          disbursementId: row.disbursementId
        }
      });
      return row;
    });

    return created;
  }

  async addBorrowerMessage(
    borrower: BorrowerPrincipal,
    caseId: string,
    input: {
      message: string;
    }
  ) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.case.findFirst({
        where: {
          id: caseId,
          tenantId: borrower.tenantId,
          borrowerId: borrower.borrowerId
        }
      });
      if (!row) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Case not found.', details: { caseId } });
      }
      if (!BORROWER_MESSAGE_ALLOWED_STATUSES.includes(row.status)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: `Cannot post message when case is ${row.status}.`,
          details: { allowedStatuses: BORROWER_MESSAGE_ALLOWED_STATUSES }
        });
      }
      const messageRow = await tx.caseMessage.create({
        data: {
          tenantId: borrower.tenantId,
          caseId: row.id,
          visibility: 'BORROWER',
          message: input.message.trim(),
          createdByAdminUserId: null,
          createdByBorrowerId: borrower.borrowerId
        }
      });

      await this.notifyCaseEventForAdmins({
        tx,
        tenantId: borrower.tenantId,
        caseId: row.id,
        assignedToAdminUserId: row.assignedToAdminUserId,
        templateKey: 'CASE_MESSAGE_FROM_BORROWER',
        title: 'Borrower replied on case',
        body: `New borrower message on case ${row.id}.`,
        dataJson: {
          caseId: row.id,
          messageId: messageRow.id,
          borrowerId: borrower.borrowerId
        } as Prisma.InputJsonValue,
        now
      });

      await this.auditService.log({
        tx,
        tenantId: borrower.tenantId,
        actorType: 'BORROWER',
        actorId: borrower.borrowerId,
        actorRole: null,
        action: 'CASE_MESSAGE_FROM_BORROWER',
        entity: 'CASE',
        entityId: row.id,
        metadata: {
          caseMessageId: messageRow.id
        }
      });

      return messageRow;
    });
  }

  async addMessage(principal: TenantAdminPrincipal, caseId: string, input: {
    visibility: 'INTERNAL' | 'BORROWER';
    message: string;
  }) {
    this.assertRole(principal.role, ['CREDIT_OFFICER', 'OPS', 'SUPER_ADMIN'], 'Role cannot add case message.');
    const row = await this.prisma.case.findFirst({
      where: { id: caseId, tenantId: principal.tenantId },
      select: { id: true }
    });
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Case not found.', details: { caseId } });
    }
    return this.prisma.caseMessage.create({
      data: {
        tenantId: principal.tenantId,
        caseId: row.id,
        visibility: input.visibility,
        message: input.message.trim(),
        createdByAdminUserId: principal.adminId
      }
    });
  }

  async assignCase(principal: TenantAdminPrincipal, caseId: string, input: { adminUserId?: string }) {
    this.assertRole(principal.role, ['CREDIT_OFFICER', 'OPS', 'SUPER_ADMIN'], 'Role cannot assign cases.');
    const assignedToAdminUserId = input.adminUserId?.trim() || principal.adminId;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.case.findFirst({
        where: { id: caseId, tenantId: principal.tenantId }
      });
      if (!row) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Case not found.', details: { caseId } });
      }
      const next = await tx.case.update({
        where: { id: row.id },
        data: { assignedToAdminUserId }
      });
      if (row.assignedToAdminUserId !== assignedToAdminUserId) {
        await this.notifyAssignment({
          tx,
          tenantId: principal.tenantId,
          caseId: row.id,
          assignedToAdminUserId,
          assignedByAdminUserId: principal.adminId
        });
      }
      await this.auditService.log({
        tx,
        tenantId: principal.tenantId,
        actorType: 'TENANT_ADMIN',
        actorId: principal.adminId,
        actorRole: principal.role,
        action: 'CASE_ASSIGNED',
        entity: 'CASE',
        entityId: row.id,
        metadata: {
          from: row.assignedToAdminUserId,
          to: assignedToAdminUserId
        }
      });
      return next;
    });
    return updated;
  }

  async transitionCase(principal: TenantAdminPrincipal, caseId: string, input: {
    toStatus: CaseStatus;
    reason?: string;
    resolutionCode?: CaseResolutionCode;
    resolutionNotes?: string;
  }) {
    this.assertTransitionRole(principal.role, input.toStatus);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.case.findFirst({
        where: { id: caseId, tenantId: principal.tenantId }
      });
      if (!row) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Case not found.', details: { caseId } });
      }
      if (!canTransitionCase(row.status, input.toStatus)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: `Invalid case transition ${row.status} -> ${input.toStatus}.`,
          details: null
        });
      }
      if (input.toStatus === 'CLOSED' && principal.role === 'OPS') {
        if (!['RESOLVED', 'REJECTED'].includes(row.status)) {
          throw new BadRequestException({
            code: 'BAD_REQUEST',
            message: 'OPS can close only RESOLVED or REJECTED cases.',
            details: { fromStatus: row.status }
          });
        }
      }
      if (['RESOLVED', 'REJECTED'].includes(input.toStatus) && !input.resolutionNotes?.trim()) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'resolutionNotes is required for RESOLVED/REJECTED transitions.',
          details: null
        });
      }
      const updated = await tx.case.update({
        where: { id: row.id },
        data: {
          status: input.toStatus,
          resolutionCode: input.toStatus === 'RESOLVED' ? (input.resolutionCode ?? null) : row.resolutionCode,
          resolutionNotes:
            input.toStatus === 'RESOLVED' || input.toStatus === 'REJECTED'
              ? input.resolutionNotes?.trim() || null
              : row.resolutionNotes,
          closedAt: input.toStatus === 'CLOSED' ? new Date() : null
        }
      });
      await tx.caseStatusHistory.create({
        data: {
          tenantId: principal.tenantId,
          caseId: row.id,
          fromStatus: row.status,
          toStatus: input.toStatus,
          changedByAdminUserId: principal.adminId,
          reason: input.reason?.trim() || null
        }
      });
      await this.auditService.log({
        tx,
        tenantId: principal.tenantId,
        actorType: 'TENANT_ADMIN',
        actorId: principal.adminId,
        actorRole: principal.role,
        action: 'CASE_STATUS_TRANSITION',
        entity: 'CASE',
        entityId: row.id,
        metadata: {
          fromStatus: row.status,
          toStatus: input.toStatus,
          reason: input.reason ?? null,
          resolutionCode: input.resolutionCode ?? null
        }
      });
      return updated;
    });
  }

  async processOverdueCases(now = new Date()): Promise<{ scanned: number; notified: number }> {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    let scanned = 0;
    let notified = 0;
    for (const tenant of tenants) {
      const rows = await this.prisma.case.findMany({
        where: {
          tenantId: tenant.id,
          slaDueAt: { lt: now },
          status: { notIn: ['RESOLVED', 'CLOSED'] },
          OR: [{ lastOverdueNotifiedAt: null }, { lastOverdueNotifiedAt: { lt: new Date(now.getTime() - 6 * 60 * 60 * 1000) } }]
        }
      });
      scanned += rows.length;
      for (const row of rows) {
        await this.prisma.$transaction(async (tx) => {
          const refreshed = await tx.case.findFirst({
            where: { id: row.id, tenantId: row.tenantId }
          });
          if (!refreshed) return;
          if (refreshed.status === 'RESOLVED' || refreshed.status === 'CLOSED') return;
          if (refreshed.lastOverdueNotifiedAt && refreshed.lastOverdueNotifiedAt >= new Date(now.getTime() - 6 * 60 * 60 * 1000)) return;

          const recipients =
            refreshed.assignedToAdminUserId
              ? [{ id: refreshed.assignedToAdminUserId }]
              : await tx.tenantAdminUser.findMany({
                  where: { tenantId: refreshed.tenantId, role: 'CREDIT_OFFICER' },
                  select: { id: true }
                });

          for (const recipient of recipients) {
            await this.notificationsService.createNotification(
              {
                tenantId: refreshed.tenantId,
                audienceType: NotificationAudienceType.ADMIN,
                audienceUserId: recipient.id,
                channel: NotificationDeliveryChannel.IN_APP,
                templateKey: 'CASE_OVERDUE',
                title: 'Case SLA overdue',
                body: `Case ${refreshed.id} is overdue for SLA response.`,
                dataJson: {
                  caseId: refreshed.id,
                  slaDueAt: refreshed.slaDueAt?.toISOString() ?? null
                },
                idempotencyKey: `case:${refreshed.id}:overdue:${now.toISOString().slice(0, 13)}:${recipient.id}`
              },
              tx
            );
          }
          await tx.case.update({
            where: { id: refreshed.id },
            data: { lastOverdueNotifiedAt: now }
          });
          notified += recipients.length;
        });
      }
    }
    this.logger.log(`cases overdue scan done scanned=${scanned} notified=${notified}`);
    return { scanned, notified };
  }
}
