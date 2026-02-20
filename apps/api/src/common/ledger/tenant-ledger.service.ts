import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import {
  LedgerAccountType,
  Prisma,
  TenantAdminRole,
  TenantLedgerAccountCode,
  TenantLedgerDirection,
  TenantLedgerEntryType
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PromMetricsService } from '../observability/prom-metrics.service';
import { TenantLedgerAccountsService } from './tenant-ledger-accounts.service';
import { assertTenantMatch } from '../tenant/assert-tenant-match';

export type TenantLedgerLineInput = {
  accountCode: TenantLedgerAccountCode;
  direction: TenantLedgerDirection;
  amount: Prisma.Decimal | number | string;
};

export type TenantLedgerEntryInput = {
  tenantId: string;
  occurredAt: Date;
  type: TenantLedgerEntryType;
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  currency?: string;
  createdBy?: string;
  actorRole?: TenantAdminRole;
  memo?: string;
  lines: TenantLedgerLineInput[];
};

export type TenantJournalEntryInput = {
  tenantId: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  createdBy?: string;
  actorRole?: TenantAdminRole;
  memo?: string;
  occurredAt?: Date;
  entries: Array<{
    accountCode: TenantLedgerAccountCode;
    direction: TenantLedgerDirection;
    amount: Prisma.Decimal | number | string;
    currency?: string;
  }>;
};

@Injectable()
export class TenantLedgerService {
  private readonly logger = new Logger(TenantLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: TenantLedgerAccountsService,
    private readonly promMetricsService: PromMetricsService
  ) {}

  private assertRoleCanPost(role: TenantAdminRole | undefined, type: TenantLedgerEntryType): void {
    if (!role) {
      return;
    }
    if (role === 'SYSTEM' || role === 'SUPER_ADMIN') {
      return;
    }

    const allowedByRole: Partial<Record<TenantAdminRole, TenantLedgerEntryType[]>> = {
      OPS: [TenantLedgerEntryType.DISBURSEMENT, TenantLedgerEntryType.REPAYMENT, TenantLedgerEntryType.ACCRUAL],
      RISK_MANAGER: [TenantLedgerEntryType.WRITE_OFF]
    };
    if ((allowedByRole[role] ?? []).includes(type)) {
      return;
    }
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: `Role ${role} cannot post ${type} ledger entries.`,
      details: null
    });
  }

  private assertRoleCanReverse(role: TenantAdminRole | undefined): void {
    if (!role || role === 'SYSTEM' || role === 'SUPER_ADMIN') {
      return;
    }
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: `Role ${role} cannot reverse ledger entries.`,
      details: null
    });
  }

  private toMinor(amount: Prisma.Decimal): bigint {
    return BigInt(amount.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toString());
  }

  assertBalanced(
    entries: Array<{ direction: TenantLedgerDirection; amount: Prisma.Decimal | number | string }>
  ): void {
    if (entries.length < 2) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Ledger journal requires at least two entries.',
        details: null
      });
    }
    let debit = new Prisma.Decimal(0);
    let credit = new Prisma.Decimal(0);
    for (const item of entries) {
      const amount = new Prisma.Decimal(item.amount);
      if (amount.lte(0)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Ledger amount must be positive.',
          details: null
        });
      }
      if (item.direction === TenantLedgerDirection.DEBIT) {
        debit = debit.plus(amount);
      } else {
        credit = credit.plus(amount);
      }
    }
    if (!debit.equals(credit)) {
      this.logger.error({
        event: 'ledger_unbalanced',
        debit: debit.toString(),
        credit: credit.toString()
      });
      throw new InternalServerErrorException({
        code: 'LEDGER_UNBALANCED',
        message: 'Ledger entries are not balanced.',
        details: { debit: debit.toString(), credit: credit.toString() }
      });
    }
  }

  async createJournal(
    input: TenantJournalEntryInput,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; reused: boolean }> {
    const currencies = [...new Set(input.entries.map((entry) => (entry.currency ?? 'NGN').trim().toUpperCase()))];
    if (currencies.length !== 1) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'All ledger entries in a journal must have same currency.',
        details: { currencies }
      });
    }

    this.assertBalanced(
      input.entries.map((entry) => ({
        direction: entry.direction,
        amount: entry.amount
      }))
    );

    return this.postEntry(
      {
        tenantId: input.tenantId,
        occurredAt: input.occurredAt ?? new Date(),
        type: TenantLedgerEntryType.ADJUSTMENT,
        idempotencyKey: input.idempotencyKey,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: input.createdBy,
        actorRole: input.actorRole,
        memo: input.memo,
        lines: input.entries.map((entry) => ({
          accountCode: entry.accountCode,
          direction: entry.direction,
          amount: entry.amount
        }))
      },
      tx
    );
  }

  async postEntry(
    input: TenantLedgerEntryInput,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; reused: boolean }> {
    if (!input.idempotencyKey.trim()) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'idempotencyKey is required for ledger posting.',
        details: null
      });
    }
    if (!input.lines.length) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Ledger entry requires at least one line.',
        details: null
      });
    }

    this.assertRoleCanPost(input.actorRole, input.type);

    let debit = new Prisma.Decimal(0);
    let credit = new Prisma.Decimal(0);
    const currency = (input.currency ?? 'NGN').trim().toUpperCase();
    const normalized = input.lines.map((line) => {
      const amount = new Prisma.Decimal(line.amount);
      if (amount.lte(0)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Ledger line amount must be > 0.',
          details: { accountCode: line.accountCode }
        });
      }
      if (line.direction === TenantLedgerDirection.DEBIT) {
        debit = debit.plus(amount);
      } else {
        credit = credit.plus(amount);
      }
      return { ...line, amount };
    });

    if (!debit.equals(credit)) {
      this.logger.error({
        event: 'ledger_unbalanced',
        tenantId: input.tenantId,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        debit: debit.toString(),
        credit: credit.toString()
      });
      throw new InternalServerErrorException({
        code: 'LEDGER_UNBALANCED',
        message: 'Ledger entry must be balanced (debits must equal credits).',
        details: {
          debit: debit.toString(),
          credit: credit.toString()
        }
      });
    }

    const db = tx ?? this.prisma;
    await this.accountsService.ensureDefaultAccounts(input.tenantId, tx);

    const existing = await db.tenantLedgerEntry.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey
        }
      },
      select: { id: true }
    });
    if (existing) {
      return { id: existing.id, reused: true };
    }

    const accounts = await db.tenantLedgerAccount.findMany({
      where: {
        tenantId: input.tenantId,
        code: { in: normalized.map((item) => item.accountCode) }
      },
      select: { id: true, code: true, tenantId: true }
    });
    for (const account of accounts) {
      assertTenantMatch(account.tenantId, input.tenantId);
    }
    const accountByCode = new Map(accounts.map((item) => [item.code, item.id]));

    const entry = await db.tenantLedgerEntry.create({
      data: {
        tenantId: input.tenantId,
        occurredAt: input.occurredAt,
        type: input.type,
        idempotencyKey: input.idempotencyKey,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: input.createdBy?.trim() || null,
        memo: input.memo?.trim() || null
      }
    });

    await db.tenantLedgerLine.createMany({
      data: normalized.map((line) => ({
        tenantId: input.tenantId,
        entryId: entry.id,
        accountId: accountByCode.get(line.accountCode)!,
        direction: line.direction,
        amount: line.amount,
        amountMinor: this.toMinor(line.amount),
        currency
      }))
    });

    this.promMetricsService.incrementLedgerPosting(input.tenantId, input.type);

    return { id: entry.id, reused: false };
  }

  // Backward-compatible wrapper for existing callers.
  async createEntryWithBalancedLines(
    input: {
      tenantId: string;
      occurredAt: Date;
      referenceType: TenantLedgerEntryType;
      referenceId: string;
      memo?: string;
      lines: Array<{
        accountType: TenantLedgerAccountCode;
        direction: TenantLedgerDirection;
        amount: Prisma.Decimal | number | string;
      }>;
    },
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string }> {
    const result = await this.postEntry(
      {
        tenantId: input.tenantId,
        occurredAt: input.occurredAt,
        type: input.referenceType,
        idempotencyKey: `${input.referenceType}:${input.referenceId}`,
        referenceType: 'LoanApplication',
        referenceId: input.referenceId,
        memo: input.memo,
        lines: input.lines.map((line) => ({
          accountCode: line.accountType,
          direction: line.direction,
          amount: line.amount
        }))
      },
      tx
    );

    return { id: result.id };
  }

  async reverseEntry(
    input: {
      tenantId: string;
      entryId: string;
      reason: string;
      createdBy?: string;
      actorRole?: TenantAdminRole;
    },
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; reused: boolean }> {
    this.assertRoleCanReverse(input.actorRole);
    const db = tx ?? this.prisma;
    const entry = await db.tenantLedgerEntry.findFirst({
      where: { id: input.entryId, tenantId: input.tenantId },
      include: { lines: true }
    });
    if (!entry) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Ledger entry not found.',
        details: { entryId: input.entryId }
      });
    }

    const idempotencyKey = `reversal:${entry.id}`;
    const existing = await db.tenantLedgerEntry.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey } },
      select: { id: true }
    });
    if (existing) {
      return { id: existing.id, reused: true };
    }

    const accountIds = [...new Set(entry.lines.map((line) => line.accountId))];
    const accounts = await db.tenantLedgerAccount.findMany({
      where: { tenantId: input.tenantId, id: { in: accountIds } },
      select: { id: true, code: true }
    });
    const codeById = new Map(accounts.map((a) => [a.id, a.code]));
    const currency = entry.lines[0]?.currency ?? 'NGN';

    return this.postEntry(
      {
        tenantId: input.tenantId,
        occurredAt: new Date(),
        type: TenantLedgerEntryType.ADJUSTMENT,
        idempotencyKey,
        referenceType: 'LEDGER_REVERSAL',
        referenceId: entry.id,
        memo: input.reason,
        currency,
        createdBy: input.createdBy,
        actorRole: input.actorRole,
        lines: entry.lines.map((line) => ({
          accountCode: codeById.get(line.accountId)!,
          direction:
            line.direction === TenantLedgerDirection.DEBIT
              ? TenantLedgerDirection.CREDIT
              : TenantLedgerDirection.DEBIT,
          amount: line.amount
        }))
      },
      tx
    );
  }

  async listAccountsWithBalances(
    tenantId: string,
    asOf?: Date
  ): Promise<
    Array<{
      code: TenantLedgerAccountCode;
      name: string;
      type: LedgerAccountType;
      normalBalance: string;
      currency: string;
      debitMinor: string;
      creditMinor: string;
      balanceMinor: string;
    }>
  > {
    await this.accountsService.ensureDefaultAccounts(tenantId);
    const accounts = await this.prisma.tenantLedgerAccount.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' }
    });
    const lines = await this.prisma.tenantLedgerLine.findMany({
      where: {
        tenantId,
        ...(asOf ? { entry: { occurredAt: { lte: asOf } } } : {})
      },
      include: {
        account: { select: { id: true } }
      }
    });
    const totals = new Map<string, { d: bigint; c: bigint }>();
    for (const line of lines) {
      const acc = totals.get(line.accountId) ?? { d: 0n, c: 0n };
      const amountMinor = line.amountMinor;
      if (line.direction === TenantLedgerDirection.DEBIT) {
        acc.d += amountMinor;
      } else {
        acc.c += amountMinor;
      }
      totals.set(line.accountId, acc);
    }

    return accounts.map((account) => {
      const t = totals.get(account.id) ?? { d: 0n, c: 0n };
      const raw = t.d - t.c;
      const normalized = account.normalBalance === 'DEBIT' ? raw : -raw;
      return {
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        currency: account.currency,
        debitMinor: t.d.toString(),
        creditMinor: t.c.toString(),
        balanceMinor: normalized.toString()
      };
    });
  }

  async listEntries(
    input: {
      tenantId: string;
      from?: Date;
      to?: Date;
      referenceType?: string;
      referenceId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    total: number;
    items: Array<{
      id: string;
      occurredAt: string;
      type: string;
      referenceType: string;
      referenceId: string;
      memo: string | null;
      createdBy: string | null;
      lines: Array<{
        accountCode: string;
        direction: string;
        amountMinor: string;
        currency: string;
      }>;
    }>;
  }> {
    const where: Prisma.TenantLedgerEntryWhereInput = {
      tenantId: input.tenantId,
      ...(input.referenceType ? { referenceType: input.referenceType } : {}),
      ...(input.referenceId ? { referenceId: input.referenceId } : {}),
      ...((input.from || input.to)
        ? {
            occurredAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {})
            }
          }
        : {})
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.tenantLedgerEntry.count({ where }),
      this.prisma.tenantLedgerEntry.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: Math.min(Math.max(input.limit ?? 50, 1), 200),
        skip: Math.max(input.offset ?? 0, 0),
        include: {
          lines: {
            include: { account: { select: { code: true } } },
            orderBy: { createdAt: 'asc' }
          }
        }
      })
    ]);
    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        type: row.type,
        referenceType: row.referenceType,
        referenceId: row.referenceId,
        memo: row.memo ?? null,
        createdBy: row.createdBy ?? null,
        lines: row.lines.map((line) => ({
          accountCode: line.account.code,
          direction: line.direction,
          amountMinor: line.amountMinor.toString(),
          currency: line.currency
        }))
      }))
    };
  }
}
