import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { CapitalPoolStatus, CapitalPoolType, Prisma } from '@prisma/client';
import { TreasuryExposureGuard } from './exposure/treasury-exposure.guard';
import { TreasuryService } from './treasury.service';

test('resolveFundingPoolForLoan chooses pool with highest available amount', async () => {
  const service = new TreasuryService(
    {} as any,
    {} as any,
    { ensureDefaultAccounts: async () => undefined } as any,
    {} as any,
    { assertCanDeploy: async () => undefined } as any
  );

  (service as any).getPoolSummary = async (_tenantId: string, poolId: string) => ({
    available: poolId === 'pool_a' ? '100.00' : '250.00',
    deployed: '0',
    repaid: '0',
    losses: '0',
    utilizationPct: 0,
    asOf: new Date().toISOString()
  });

  const tx = {
    capitalPool: {
      findMany: async () => [
        {
          id: 'pool_a',
          tenantId: 'tenant_1',
          name: 'A',
          type: CapitalPoolType.TREASURY,
          status: CapitalPoolStatus.ACTIVE,
          currency: 'NGN',
          externalRef: null,
          rulesJson: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z')
        },
        {
          id: 'pool_b',
          tenantId: 'tenant_1',
          name: 'B',
          type: CapitalPoolType.TREASURY,
          status: CapitalPoolStatus.ACTIVE,
          currency: 'NGN',
          externalRef: null,
          rulesJson: null,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z')
        }
      ]
    }
  } as any;

  const selected = await service.resolveFundingPoolForLoan(
    'tenant_1',
    'loan_1',
    new Prisma.Decimal(50),
    tx
  );
  assert.equal(selected.id, 'pool_b');
});

test('exposure guard blocks deployment when pool available capital is insufficient', async () => {
  const guard = new TreasuryExposureGuard({
    capitalAllocation: {
      aggregate: async () => ({
        _sum: {
          deployedAmount: new Prisma.Decimal(400),
          releasedAmount: new Prisma.Decimal(0),
          writtenOffAmount: new Prisma.Decimal(0)
        }
      })
    }
  } as any);

  await assert.rejects(
    () =>
      guard.assertCanDeploy({
        tenantId: 'tenant_1',
        poolId: 'pool_1',
        amount: new Prisma.Decimal(200),
        rulesJson: { initialCapital: 500 }
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match((error as Error).message, /insufficient/i);
      return true;
    }
  );
});

test('deployToLoan creates allocation and posts ledger movement', async () => {
  const posted: Array<{ idempotencyKey: string }> = [];
  const service = new TreasuryService(
    {} as any,
    {
      postEntry: async (input: { idempotencyKey: string }) => {
        posted.push({ idempotencyKey: input.idempotencyKey });
      }
    } as any,
    { ensureDefaultAccounts: async () => undefined } as any,
    { recordEvent: async () => undefined } as any,
    { assertCanDeploy: async () => undefined } as any
  );

  (service as any).resolveFundingPoolForLoan = async () => ({
    id: 'pool_1',
    tenantId: 'tenant_1',
    name: 'Main Pool',
    type: CapitalPoolType.TREASURY,
    status: CapitalPoolStatus.ACTIVE,
    currency: 'NGN',
    externalRef: null,
    rulesJson: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const tx = {
    capitalAllocation: {
      findUnique: async () => null,
      create: async () => ({
        id: 'alloc_1',
        poolId: 'pool_1'
      })
    }
  } as any;

  const deployed = await service.deployToLoan({
    tenantId: 'tenant_1',
    loanApplicationId: 'loan_1',
    amount: new Prisma.Decimal(125),
    currency: 'NGN',
    idempotencyKey: 'disb_1',
    actor: { actorId: 'admin_1', actorRole: 'OPS' },
    tx
  });

  assert.equal(deployed.poolId, 'pool_1');
  assert.equal(posted.length, 1);
  assert.match(posted[0].idempotencyKey, /capital:deploy/);
});

