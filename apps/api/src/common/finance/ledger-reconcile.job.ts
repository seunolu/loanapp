import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { PromMetricsService } from '../observability/prom-metrics.service';

type Totals = {
  asset: bigint;
  liability: bigint;
  equity: bigint;
  income: bigint;
  expense: bigint;
};

@Injectable()
export class LedgerReconcileJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LedgerReconcileJob.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly promMetricsService: PromMetricsService
  ) {}

  onModuleInit(): void {
    const enabled = (this.configService.get<string>('LEDGER_RECONCILE_JOB_ENABLED') ?? 'true') !== 'false';
    if (!enabled) {
      return;
    }
    this.scheduleNextRun();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextRun(): void {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0, 0));
    if (now >= next) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    const waitMs = Math.max(next.getTime() - now.getTime(), 1_000);
    this.timer = setTimeout(() => {
      void this.runOnce().finally(() => this.scheduleNextRun());
    }, waitMs);
    this.logger.log(`ledger:reconcile scheduled at ${next.toISOString()}`);
  }

  async runOnce(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      try {
        const totals = await this.computeTotals(tenant.id);
        const delta = totals.asset - (totals.liability + totals.equity + totals.income - totals.expense);
        if (delta !== 0n) {
          this.promMetricsService.incrementLedgerReconcileMismatch(tenant.id);
          this.logger.error(
            `ledger:reconcile mismatch tenantId=${tenant.id} deltaMinor=${delta.toString()} asset=${totals.asset.toString()} liability=${totals.liability.toString()} equity=${totals.equity.toString()} income=${totals.income.toString()} expense=${totals.expense.toString()}`
          );
          await (this.prisma as any).auditEvent.create({
            data: {
              tenantId: tenant.id,
              actorType: 'SYSTEM',
              action: 'LEDGER.RECONCILE_MISMATCH',
              entityType: 'TENANT',
              entityId: tenant.id,
              metadataJson: {
                deltaMinor: delta.toString(),
                assetMinor: totals.asset.toString(),
                liabilityMinor: totals.liability.toString(),
                equityMinor: totals.equity.toString(),
                incomeMinor: totals.income.toString(),
                expenseMinor: totals.expense.toString()
              }
            }
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`ledger:reconcile failed tenantId=${tenant.id} message=${message}`);
      }
    }
  }

  private async computeTotals(tenantId: string): Promise<Totals> {
    const rows = await this.prisma.$queryRaw<Array<{ type: string; normalBalance: string; direction: string; totalMinor: bigint }>>`
      SELECT
        a."type"::text AS "type",
        a."normalBalance"::text AS "normalBalance",
        l."direction"::text AS "direction",
        COALESCE(SUM(l."amountMinor"), 0)::bigint AS "totalMinor"
      FROM "TenantLedgerLine" l
      INNER JOIN "TenantLedgerAccount" a ON a."id" = l."accountId"
      WHERE l."tenantId" = ${tenantId}
      GROUP BY a."type", a."normalBalance", l."direction"
    `;

    const totals: Totals = {
      asset: 0n,
      liability: 0n,
      equity: 0n,
      income: 0n,
      expense: 0n
    };

    for (const row of rows) {
      const direction = row.direction === 'DEBIT' ? 'DEBIT' : 'CREDIT';
      const normalBalance = row.normalBalance === 'DEBIT' ? 'DEBIT' : 'CREDIT';
      const amount = BigInt(row.totalMinor);
      const signed = normalBalance === direction ? amount : -amount;

      switch (row.type) {
        case 'ASSET':
          totals.asset += signed;
          break;
        case 'LIABILITY':
          totals.liability += signed;
          break;
        case 'EQUITY':
          totals.equity += signed;
          break;
        case 'INCOME':
          totals.income += signed;
          break;
        case 'EXPENSE':
          totals.expense += signed;
          break;
        default:
          break;
      }
    }

    return totals;
  }
}
