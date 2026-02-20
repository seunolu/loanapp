import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../database/prisma.service';
import { ensureTenantMatch, requireTenantId } from './tenant-guard';

type TenantScopedModel =
  | 'TenantLoanApplication'
  | 'LoanRepayment'
  | 'TenantDisbursement'
  | 'TenantLedgerEntry'
  | 'LoanProduct'
  | 'TenantAdminUser'
  | 'LoanApplicationStatusHistory'
  | 'LoanApplication'
  | 'Disbursement'
  | 'Repayment';

type ScopeConfig = {
  delegate: string;
  tenantField: 'tenantId' | 'lenderId';
};

type ScopedArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

const MODEL_SCOPE: Record<TenantScopedModel, ScopeConfig> = {
  TenantLoanApplication: { delegate: 'tenantLoanApplication', tenantField: 'tenantId' },
  LoanRepayment: { delegate: 'loanRepayment', tenantField: 'tenantId' },
  TenantDisbursement: { delegate: 'tenantDisbursement', tenantField: 'tenantId' },
  TenantLedgerEntry: { delegate: 'tenantLedgerEntry', tenantField: 'tenantId' },
  LoanProduct: { delegate: 'loanProduct', tenantField: 'tenantId' },
  TenantAdminUser: { delegate: 'tenantAdminUser', tenantField: 'tenantId' },
  LoanApplicationStatusHistory: { delegate: 'loanApplicationStatusHistory', tenantField: 'tenantId' },
  LoanApplication: { delegate: 'loanApplication', tenantField: 'lenderId' },
  Disbursement: { delegate: 'disbursement', tenantField: 'lenderId' },
  Repayment: { delegate: 'repayment', tenantField: 'lenderId' }
};

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function validateTenantConstraint(
  payload: Record<string, unknown>,
  tenantField: 'tenantId' | 'lenderId',
  tenantId: string
): void {
  const scoped = payload[tenantField];
  if (scoped == null) {
    return;
  }
  if (typeof scoped !== 'string') {
    throw new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Resource not found.',
      details: null
    });
  }
  ensureTenantMatch(scoped, tenantId);
}

function mergeTenantWhere(
  where: Record<string, unknown> | undefined,
  tenantField: 'tenantId' | 'lenderId',
  tenantId: string
): Record<string, unknown> {
  const current = asObject(where);
  validateTenantConstraint(current, tenantField, tenantId);
  return {
    ...current,
    [tenantField]: tenantId
  };
}

function mergeTenantData(
  data: Record<string, unknown> | undefined,
  tenantField: 'tenantId' | 'lenderId',
  tenantId: string
): Record<string, unknown> {
  const current = asObject(data);
  validateTenantConstraint(current, tenantField, tenantId);
  return {
    ...current,
    [tenantField]: tenantId
  };
}

function resolveDelegate(prisma: PrismaService | Record<string, unknown>, model: TenantScopedModel): any {
  const config = MODEL_SCOPE[model];
  return (prisma as any)[config.delegate];
}

export function withTenant(prisma: PrismaService | Record<string, unknown>, tenantIdInput: string) {
  const tenantId = requireTenantId(tenantIdInput);

  return {
    tenantId,
    prisma,
    async findUniqueTenantScoped<T extends ScopedArgs>(input: { model: TenantScopedModel; args: T }) {
      const config = MODEL_SCOPE[input.model];
      const delegate = resolveDelegate(prisma, input.model);
      const where = mergeTenantWhere(asObject(input.args).where as Record<string, unknown> | undefined, config.tenantField, tenantId);
      return delegate.findFirst({
        ...input.args,
        where
      });
    },
    async findFirstTenantScoped<T extends ScopedArgs>(input: { model: TenantScopedModel; args: T }) {
      const config = MODEL_SCOPE[input.model];
      const delegate = resolveDelegate(prisma, input.model);
      const where = mergeTenantWhere(asObject(input.args).where as Record<string, unknown> | undefined, config.tenantField, tenantId);
      return delegate.findFirst({
        ...input.args,
        where
      });
    },
    async findManyTenantScoped<T extends ScopedArgs>(input: { model: TenantScopedModel; args: T }) {
      const config = MODEL_SCOPE[input.model];
      const delegate = resolveDelegate(prisma, input.model);
      const where = mergeTenantWhere(asObject(input.args).where as Record<string, unknown> | undefined, config.tenantField, tenantId);
      return delegate.findMany({
        ...input.args,
        where
      });
    },
    async createTenantScoped<T extends ScopedArgs>(input: { model: TenantScopedModel; args: T }) {
      const config = MODEL_SCOPE[input.model];
      const delegate = resolveDelegate(prisma, input.model);
      const args = asObject(input.args);
      const data = mergeTenantData(args.data as Record<string, unknown> | undefined, config.tenantField, tenantId);
      return delegate.create({
        ...args,
        data
      });
    },
    async updateTenantScoped<T extends ScopedArgs>(input: { model: TenantScopedModel; args: T }) {
      const config = MODEL_SCOPE[input.model];
      const delegate = resolveDelegate(prisma, input.model);
      const args = asObject(input.args);
      const where = mergeTenantWhere(args.where as Record<string, unknown> | undefined, config.tenantField, tenantId);
      const existing = await delegate.findFirst({ where, select: { id: true, [config.tenantField]: true } });
      if (!existing) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Resource not found.',
          details: null
        });
      }
      validateTenantConstraint(existing, config.tenantField, tenantId);
      return delegate.update({
        ...args,
        where: { id: existing.id }
      });
    },
    async deleteTenantScoped<T extends ScopedArgs>(input: { model: TenantScopedModel; args: T }) {
      const config = MODEL_SCOPE[input.model];
      const delegate = resolveDelegate(prisma, input.model);
      const args = asObject(input.args);
      const where = mergeTenantWhere(args.where as Record<string, unknown> | undefined, config.tenantField, tenantId);
      const existing = await delegate.findFirst({ where, select: { id: true, [config.tenantField]: true } });
      if (!existing) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Resource not found.',
          details: null
        });
      }
      validateTenantConstraint(existing, config.tenantField, tenantId);
      return delegate.delete({ where: { id: existing.id } });
    }
  };
}
