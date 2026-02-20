import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CapitalAllocationStatus,
  CapitalPoolStatus,
  CapitalPoolType,
  Prisma,
  TenantLedgerAccountCode,
  TenantLedgerDirection,
  TenantLedgerEntryType
} from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import { PrismaService } from '../common/database/prisma.service';
import { createPoolAccountsIfMissing } from '../common/ledger/capital-pool-ledger.accounts';
import { TenantLedgerAccountsService } from '../common/ledger/tenant-ledger-accounts.service';
import { TenantLedgerService } from '../common/ledger/tenant-ledger.service';
import { TreasuryExposureGuard } from './exposure/treasury-exposure.guard';

type TreasuryRole = 'SUPER_ADMIN' | 'OPS' | 'SYSTEM' | 'RISK_MANAGER' | string;

type PoolRules = {
  initialCapital?: number;
  maxDeployedAmount?: number;
  maxUtilizationPct?: number;
  [key: string]: unknown;
};

type TreasuryActor = {
  actorId?: string | null;
  actorRole?: string | null;
};

@Injectable()
export class TreasuryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: TenantLedgerService,
    private readonly ledgerAccountsService: TenantLedgerAccountsService,
    private readonly auditService: AuditService,
    private readonly exposureGuard: TreasuryExposureGuard
  ) {}

  assertCanRead(role: TreasuryRole): void {
    if (role === 'SUPER_ADMIN' || role === 'OPS' || role === 'SYSTEM' || role === 'RISK_MANAGER') {
      return;
    }
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Treasury access is restricted.',
      details: null
    });
  }

  assertCanManage(role: TreasuryRole): void {
    if (role === 'SUPER_ADMIN' || role === 'OPS' || role === 'SYSTEM') {
      return;
    }
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Only OPS or SUPER_ADMIN can manage treasury pools.',
      details: null
    });
  }

  async createPool(input: {
    tenantId: string;
    name: string;
    type: CapitalPoolType;
    currency?: string;
    externalRef?: string | null;
    rulesJson?: unknown;
  }) {
    const pool = await this.prisma.capitalPool.create({
      data: {
        tenantId: input.tenantId,
        name: input.name.trim(),
        type: input.type,
        currency: (input.currency ?? 'NGN').trim().toUpperCase(),
        externalRef: input.externalRef?.trim() || null,
        rulesJson: (input.rulesJson ?? Prisma.JsonNull) as Prisma.InputJsonValue
      }
    });
    await createPoolAccountsIfMissing(input.tenantId, pool.id, this.ledgerAccountsService);
    return pool;
  }

  async listPools(tenantId: string) {
    return this.prisma.capitalPool.findMany({
      where: { tenantId },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }]
    });
  }

  async getPool(tenantId: string, id: string) {
    const pool = await this.prisma.capitalPool.findFirst({
      where: { tenantId, id }
    });
    if (!pool) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Capital pool not found.',
        details: { id }
      });
    }
    return pool;
  }

  async updatePool(
    tenantId: string,
    id: string,
    patch: { name?: string; status?: CapitalPoolStatus; rulesJson?: unknown; externalRef?: string | null }
  ) {
    await this.getPool(tenantId, id);
    return this.prisma.capitalPool.update({
      where: { id },
      data: {
        ...(patch.name != null ? { name: patch.name.trim() } : {}),
        ...(patch.status != null ? { status: patch.status } : {}),
        ...(patch.externalRef !== undefined ? { externalRef: patch.externalRef?.trim() || null } : {}),
        ...(patch.rulesJson !== undefined
          ? { rulesJson: (patch.rulesJson ?? Prisma.JsonNull) as Prisma.InputJsonValue }
          : {})
      }
    });
  }

  async resolveFundingPoolForLoan(
    tenantId: string,
    loanApplicationId: string,
    amount: Prisma.Decimal,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.prisma;
    const pools = await db.capitalPool.findMany({
      where: { tenantId, status: CapitalPoolStatus.ACTIVE },
      orderBy: { createdAt: 'asc' }
    });
    if (pools.length === 0) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'No ACTIVE capital pool available for this tenant.',
        details: null
      });
    }

    const availableByPool = await Promise.all(
      pools.map(async (pool) => {
        const summary = await this.getPoolSummary(tenantId, pool.id, tx);
        return { pool, available: new Prisma.Decimal(summary.available) };
      })
    );

    availableByPool.sort((a, b) => {
      if (a.available.eq(b.available)) {
        return a.pool.createdAt.getTime() - b.pool.createdAt.getTime();
      }
      return a.available.gt(b.available) ? -1 : 1;
    });

    for (const candidate of availableByPool) {
      await this.exposureGuard.assertCanDeploy({
        tenantId,
        poolId: candidate.pool.id,
        amount,
        rulesJson: candidate.pool.rulesJson,
        tx
      });
      return candidate.pool;
    }

    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: 'No capital pool passed exposure checks for deployment.',
      details: { loanApplicationId }
    });
  }

  async deployToLoan(input: {
    tenantId: string;
    loanApplicationId: string;
    amount: Prisma.Decimal;
    currency: string;
    idempotencyKey: string;
    actor: TreasuryActor;
    tx: Prisma.TransactionClient;
  }): Promise<{ allocationId: string; poolId: string }> {
    const existing = await input.tx.capitalAllocation.findUnique({
      where: {
        tenantId_loanApplicationId: {
          tenantId: input.tenantId,
          loanApplicationId: input.loanApplicationId
        }
      }
    });

    if (existing) {
      return { allocationId: existing.id, poolId: existing.poolId };
    }

    const pool = await this.resolveFundingPoolForLoan(input.tenantId, input.loanApplicationId, input.amount, input.tx);
    await createPoolAccountsIfMissing(input.tenantId, pool.id, this.ledgerAccountsService, input.tx);

    const allocation = await input.tx.capitalAllocation.create({
      data: {
        tenantId: input.tenantId,
        poolId: pool.id,
        loanApplicationId: input.loanApplicationId,
        status: CapitalAllocationStatus.DEPLOYED,
        reservedAmount: input.amount,
        deployedAmount: input.amount,
        releasedAmount: new Prisma.Decimal(0),
        writtenOffAmount: new Prisma.Decimal(0)
      }
    });

    await this.ledgerService.postEntry(
      {
        tenantId: input.tenantId,
        occurredAt: new Date(),
        type: TenantLedgerEntryType.ADJUSTMENT,
        idempotencyKey: `capital:deploy:${input.idempotencyKey}`,
        referenceType: 'LoanApplication',
        referenceId: input.loanApplicationId,
        currency: input.currency,
        createdBy: input.actor.actorId ?? undefined,
        actorRole: (input.actor.actorRole as any) ?? undefined,
        memo: `Capital deployed from pool ${pool.id}`,
        lines: [
          {
            accountCode: TenantLedgerAccountCode.CAPITAL_POOL_DEPLOYED,
            direction: TenantLedgerDirection.DEBIT,
            amount: input.amount
          },
          {
            accountCode: TenantLedgerAccountCode.CAPITAL_POOL_AVAILABLE,
            direction: TenantLedgerDirection.CREDIT,
            amount: input.amount
          }
        ]
      },
      input.tx
    );

    await this.auditService.recordEvent({
      actorType: 'TENANT_ADMIN',
      actorId: input.actor.actorId ?? null,
      actorRole: input.actor.actorRole ?? null,
      tenantId: input.tenantId,
      action: 'TREASURY.MOVE',
      entityType: 'CapitalAllocation',
      entityId: allocation.id,
      metadata: {
        poolId: pool.id,
        loanApplicationId: input.loanApplicationId,
        amount: input.amount.toString(),
        movement: 'CAPITAL_POOL_AVAILABLE_TO_DEPLOYED'
      },
      idempotencyKey: `capital_allocated:${allocation.id}`,
      tx: input.tx
    });

    return { allocationId: allocation.id, poolId: pool.id };
  }

  async applyPrincipalRepayment(input: {
    tenantId: string;
    loanApplicationId: string;
    principalAmount: Prisma.Decimal;
    currency: string;
    idempotencyKey: string;
    actor: TreasuryActor;
    tx: Prisma.TransactionClient;
  }): Promise<void> {
    if (input.principalAmount.lte(0)) {
      return;
    }

    const allocation = await input.tx.capitalAllocation.findUnique({
      where: {
        tenantId_loanApplicationId: {
          tenantId: input.tenantId,
          loanApplicationId: input.loanApplicationId
        }
      }
    });
    if (!allocation) {
      return;
    }

    const nextReleased = allocation.releasedAmount.plus(input.principalAmount);
    const outstanding = allocation.deployedAmount.minus(nextReleased).minus(allocation.writtenOffAmount);
    await input.tx.capitalAllocation.update({
      where: { id: allocation.id },
      data: {
        releasedAmount: nextReleased,
        status: outstanding.lte(0) ? CapitalAllocationStatus.RELEASED : CapitalAllocationStatus.DEPLOYED
      }
    });

    await this.ledgerService.postEntry(
      {
        tenantId: input.tenantId,
        occurredAt: new Date(),
        type: TenantLedgerEntryType.ADJUSTMENT,
        idempotencyKey: `capital:repayment:${input.idempotencyKey}`,
        referenceType: 'LoanApplication',
        referenceId: input.loanApplicationId,
        currency: input.currency,
        createdBy: input.actor.actorId ?? undefined,
        actorRole: (input.actor.actorRole as any) ?? undefined,
        memo: `Capital principal repaid to pool ${allocation.poolId}`,
        lines: [
          {
            accountCode: TenantLedgerAccountCode.CAPITAL_POOL_REPAID,
            direction: TenantLedgerDirection.DEBIT,
            amount: input.principalAmount
          },
          {
            accountCode: TenantLedgerAccountCode.CAPITAL_POOL_DEPLOYED,
            direction: TenantLedgerDirection.CREDIT,
            amount: input.principalAmount
          }
        ]
      },
      input.tx
    );
  }

  async applyWriteOff(input: {
    tenantId: string;
    loanApplicationId: string;
    amount: Prisma.Decimal;
    currency: string;
    idempotencyKey: string;
    actor: TreasuryActor;
    tx: Prisma.TransactionClient;
  }): Promise<void> {
    if (input.amount.lte(0)) {
      return;
    }
    const allocation = await input.tx.capitalAllocation.findUnique({
      where: {
        tenantId_loanApplicationId: {
          tenantId: input.tenantId,
          loanApplicationId: input.loanApplicationId
        }
      }
    });
    if (!allocation) {
      return;
    }

    const outstanding = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      allocation.deployedAmount.minus(allocation.releasedAmount).minus(allocation.writtenOffAmount)
    );
    if (outstanding.lte(0)) {
      return;
    }
    const writeOffAmount = Prisma.Decimal.min(outstanding, input.amount);
    const nextWrittenOff = allocation.writtenOffAmount.plus(writeOffAmount);
    await input.tx.capitalAllocation.update({
      where: { id: allocation.id },
      data: {
        writtenOffAmount: nextWrittenOff,
        status: CapitalAllocationStatus.WRITTEN_OFF
      }
    });

    await this.ledgerService.postEntry(
      {
        tenantId: input.tenantId,
        occurredAt: new Date(),
        type: TenantLedgerEntryType.WRITE_OFF,
        idempotencyKey: `capital:writeoff:${input.idempotencyKey}`,
        referenceType: 'LoanApplication',
        referenceId: input.loanApplicationId,
        currency: input.currency,
        createdBy: input.actor.actorId ?? undefined,
        actorRole: (input.actor.actorRole as any) ?? undefined,
        memo: `Capital write-off from pool ${allocation.poolId}`,
        lines: [
          {
            accountCode: TenantLedgerAccountCode.CAPITAL_POOL_LOSSES,
            direction: TenantLedgerDirection.DEBIT,
            amount: writeOffAmount
          },
          {
            accountCode: TenantLedgerAccountCode.CAPITAL_POOL_DEPLOYED,
            direction: TenantLedgerDirection.CREDIT,
            amount: writeOffAmount
          }
        ]
      },
      input.tx
    );
  }

  async getPoolSummary(tenantId: string, poolId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const pool = await db.capitalPool.findFirst({ where: { tenantId, id: poolId } });
    if (!pool) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Capital pool not found.',
        details: { poolId }
      });
    }

    const sums = await db.capitalAllocation.aggregate({
      where: { tenantId, poolId },
      _sum: {
        deployedAmount: true,
        releasedAmount: true,
        writtenOffAmount: true
      }
    });

    const deployedTotal = sums._sum.deployedAmount ?? new Prisma.Decimal(0);
    const repaid = sums._sum.releasedAmount ?? new Prisma.Decimal(0);
    const losses = sums._sum.writtenOffAmount ?? new Prisma.Decimal(0);
    const deployedOutstanding = Prisma.Decimal.max(new Prisma.Decimal(0), deployedTotal.minus(repaid).minus(losses));
    const rules = this.parseRules(pool.rulesJson);
    const initialCapital = rules.initialCapital ?? rules.maxDeployedAmount ?? 0;
    const available = this.computeAvailableFromRules(initialCapital, deployedOutstanding, losses);
    const utilizationPct =
      initialCapital > 0
        ? Number(
            deployedOutstanding
              .div(new Prisma.Decimal(initialCapital))
              .mul(100)
              .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP)
              .toString()
          )
        : 0;

    return {
      available: available.toString(),
      deployed: deployedOutstanding.toString(),
      repaid: repaid.toString(),
      losses: losses.toString(),
      utilizationPct,
      asOf: new Date().toISOString()
    };
  }

  async getPoolPerformance(tenantId: string, poolId: string, from?: Date, to?: Date) {
    await this.getPool(tenantId, poolId);
    const where: Prisma.CapitalAllocationWhereInput = {
      tenantId,
      poolId,
      ...((from || to)
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {})
            }
          }
        : {})
    };
    const sums = await this.prisma.capitalAllocation.aggregate({
      where,
      _sum: {
        deployedAmount: true,
        releasedAmount: true,
        writtenOffAmount: true
      }
    });
    return {
      totalDisbursed: (sums._sum.deployedAmount ?? new Prisma.Decimal(0)).toString(),
      totalPrincipalRepaid: (sums._sum.releasedAmount ?? new Prisma.Decimal(0)).toString(),
      totalDefaultsAmount: (sums._sum.writtenOffAmount ?? new Prisma.Decimal(0)).toString()
    };
  }

  async listPoolAllocations(tenantId: string, poolId: string, take = 20) {
    await this.getPool(tenantId, poolId);
    return this.prisma.capitalAllocation.findMany({
      where: { tenantId, poolId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 100)
    });
  }

  async captureDailySnapshots(asOfDate?: Date): Promise<number> {
    const now = asOfDate ?? new Date();
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const pools = await this.prisma.capitalPool.findMany({
      where: { status: CapitalPoolStatus.ACTIVE },
      select: { id: true, tenantId: true }
    });
    for (const pool of pools) {
      const summary = await this.getPoolSummary(pool.tenantId, pool.id);
      await this.prisma.capitalPoolBalanceSnapshot.upsert({
        where: {
          poolId_asOfDate: {
            poolId: pool.id,
            asOfDate: day
          }
        },
        update: {
          available: new Prisma.Decimal(summary.available),
          deployed: new Prisma.Decimal(summary.deployed),
          repaid: new Prisma.Decimal(summary.repaid),
          losses: new Prisma.Decimal(summary.losses)
        },
        create: {
          tenantId: pool.tenantId,
          poolId: pool.id,
          asOfDate: day,
          available: new Prisma.Decimal(summary.available),
          deployed: new Prisma.Decimal(summary.deployed),
          repaid: new Prisma.Decimal(summary.repaid),
          losses: new Prisma.Decimal(summary.losses)
        }
      });
    }
    return pools.length;
  }

  private parseRules(rules: unknown): PoolRules {
    if (!rules || typeof rules !== 'object' || Array.isArray(rules)) {
      return {};
    }
    return rules as PoolRules;
  }

  private computeAvailableFromRules(
    initialCapital: number,
    deployedOutstanding: Prisma.Decimal,
    losses: Prisma.Decimal
  ): Prisma.Decimal {
    if (initialCapital <= 0) {
      return new Prisma.Decimal('0');
    }
    return Prisma.Decimal.max(new Prisma.Decimal(0), new Prisma.Decimal(initialCapital).minus(deployedOutstanding).minus(losses));
  }
}
