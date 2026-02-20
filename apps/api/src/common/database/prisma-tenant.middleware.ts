import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from './prisma.service';
import type { RequestContextStore } from '../request-context/request-context.store';

type TenantField = 'tenantId' | 'lenderId';

type ScopeConfig = {
  tenantField: TenantField;
};

const TENANT_SCOPED_MODELS: Record<string, ScopeConfig> = {
  TenantLoanApplication: { tenantField: 'tenantId' },
  LoanProduct: { tenantField: 'tenantId' },
  LoanRepayment: { tenantField: 'tenantId' },
  CollectionsCase: { tenantField: 'tenantId' },
  TenantLedgerEntry: { tenantField: 'tenantId' },
  TreasuryAccount: { tenantField: 'tenantId' },
  RiskAssessment: { tenantField: 'tenantId' },
  PaymentIntent: { tenantField: 'tenantId' },
  Mandate: { tenantField: 'tenantId' },
  MandateDebit: { tenantField: 'tenantId' },
  PayoutIntent: { tenantField: 'tenantId' },
  WebhookEvent: { tenantField: 'tenantId' },
  TenantAdminUser: { tenantField: 'tenantId' },
  CollectionActivity: { tenantField: 'tenantId' },
  LoanApplicationRiskAssessment: { tenantField: 'tenantId' },
  LoanApplicationRiskAssessmentHistory: { tenantField: 'tenantId' },
  LoanApplicationHold: { tenantField: 'tenantId' },
  FraudSignal: { tenantField: 'tenantId' },
  FraudAlert: { tenantField: 'tenantId' },
  RiskPolicy: { tenantField: 'tenantId' },
  RiskEvaluation: { tenantField: 'tenantId' },
  IdentityVerification: { tenantField: 'lenderId' },
  UserConsent: { tenantField: 'lenderId' }
};

const READ_ACTIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy'
]);
const CREATE_ACTIONS = new Set(['create', 'createMany']);
const WRITE_ACTIONS = new Set(['update', 'updateMany', 'delete', 'deleteMany', 'upsert']);

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function tenantMismatch(model: string, expected: string, actual: unknown): ForbiddenException {
  return new ForbiddenException({
    code: 'FORBIDDEN',
    message: 'Cross-tenant access is not allowed.',
    details: { model, expectedTenantId: expected, actualTenantId: actual ?? null }
  });
}

function ensureTenantValue(model: string, tenantField: TenantField, payload: Record<string, unknown>, tenantId: string): void {
  const incoming = payload[tenantField];
  if (incoming == null) {
    payload[tenantField] = tenantId;
    return;
  }
  if (incoming !== tenantId) {
    throw tenantMismatch(model, tenantId, incoming);
  }
}

function lowerFirst(value: string): string {
  return `${value.slice(0, 1).toLowerCase()}${value.slice(1)}`;
}

async function ensureWriteOwnership(
  prisma: PrismaService,
  model: string,
  tenantField: TenantField,
  where: Record<string, unknown>,
  tenantId: string
): Promise<void> {
  if (where[tenantField] != null) {
    if (where[tenantField] !== tenantId) {
      throw tenantMismatch(model, tenantId, where[tenantField]);
    }
    return;
  }

  const delegate = (prisma as unknown as Record<string, any>)[lowerFirst(model)];
  if (!delegate || typeof delegate.findFirst !== 'function') {
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Tenant guard cannot validate write operation.',
      details: { model }
    });
  }

  const existing = await delegate.findFirst({
    where: { AND: [where, { [tenantField]: tenantId }] },
    select: { id: true, [tenantField]: true }
  });
  if (!existing) {
    throw tenantMismatch(model, tenantId, null);
  }
}

export function prismaTenantMiddleware(prisma: PrismaService, requestContextStore: RequestContextStore): Prisma.Middleware {
  return async (params, next) => {
    const model = params.model;
    if (!model || !TENANT_SCOPED_MODELS[model]) {
      return next(params);
    }

    const tenantId = requestContextStore.getTenantId();
    if (!tenantId) {
      return next(params);
    }

    const tenantField = TENANT_SCOPED_MODELS[model].tenantField;
    const args = asObject(params.args);

    if (READ_ACTIONS.has(params.action)) {
      const where = asObject(args.where);
      ensureTenantValue(model, tenantField, where, tenantId);
      args.where = where;
      if (params.action === 'findUnique') {
        params.action = 'findFirst';
      }
      if (params.action === 'findUniqueOrThrow') {
        params.action = 'findFirstOrThrow';
      }
      params.args = args;
      return next(params);
    }

    if (CREATE_ACTIONS.has(params.action)) {
      if (params.action === 'createMany') {
        const data = args.data;
        if (Array.isArray(data)) {
          args.data = data.map((row) => {
            const nextRow = asObject(row);
            ensureTenantValue(model, tenantField, nextRow, tenantId);
            return nextRow;
          });
        } else {
          const nextRow = asObject(data);
          ensureTenantValue(model, tenantField, nextRow, tenantId);
          args.data = nextRow;
        }
      } else {
        const data = asObject(args.data);
        ensureTenantValue(model, tenantField, data, tenantId);
        args.data = data;
      }
      params.args = args;
      return next(params);
    }

    if (WRITE_ACTIONS.has(params.action)) {
      if (params.action === 'updateMany' || params.action === 'deleteMany') {
        const where = asObject(args.where);
        ensureTenantValue(model, tenantField, where, tenantId);
        args.where = where;
        params.args = args;
        return next(params);
      }

      if (params.action === 'upsert') {
        const where = asObject(args.where);
        await ensureWriteOwnership(prisma, model, tenantField, where, tenantId);
        const createData = asObject(args.create);
        ensureTenantValue(model, tenantField, createData, tenantId);
        const updateData = asObject(args.update);
        ensureTenantValue(model, tenantField, updateData, tenantId);
        args.create = createData;
        args.update = updateData;
        params.args = args;
        return next(params);
      }

      const where = asObject(args.where);
      await ensureWriteOwnership(prisma, model, tenantField, where, tenantId);
      params.args = args;
      return next(params);
    }

    return next(params);
  };
}
