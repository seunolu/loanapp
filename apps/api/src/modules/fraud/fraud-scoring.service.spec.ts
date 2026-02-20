import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { FraudLevel, FraudSeverity, FraudSignalType } from '@prisma/client';
import { FraudScoringService } from './fraud-scoring.service';

type FraudSignalRow = {
  type: FraudSignalType;
  severity: FraudSeverity;
  createdAt: Date;
};

function buildService(events: FraudSignalRow[]) {
  const captured: Array<{ riskScore: number; fraudLevel: FraudLevel; flags: string[] }> = [];
  const prisma = {
    fraudSignal: {
      findMany: async () => events
    },
    fraudSignalAggregate: {
      upsert: async ({ create }: { create: { riskScore: number; fraudLevel: FraudLevel; flags: string[] } }) => {
        captured.push({
          riskScore: create.riskScore,
          fraudLevel: create.fraudLevel,
          flags: create.flags
        });
        return {
          id: 'agg_1',
          tenantId: 'tenant_1',
          borrowerId: 'borrower_1',
          riskScore: create.riskScore,
          fraudLevel: create.fraudLevel,
          flags: create.flags,
          lastEvaluatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    }
  };
  return { service: new FraudScoringService(prisma as any), captured };
}

test('fraud scoring applies weight, severity, and recency multiplier', async () => {
  const now = Date.now();
  const events: FraudSignalRow[] = [
    {
      type: FraudSignalType.CARD_CHARGEBACK,
      severity: FraudSeverity.CRITICAL,
      createdAt: new Date(now - 1 * 60 * 60 * 1000)
    }
  ];
  const { service, captured } = buildService(events);

  const result = await service.evaluateBorrower('tenant_1', 'borrower_1');

  assert.equal(captured.length, 1);
  assert.ok(captured[0].riskScore >= 500);
  assert.equal(result.aggregate.fraudLevel, FraudLevel.HIGH);
});

test('fraud scoring maps thresholds to FraudLevel', async () => {
  const now = Date.now();
  const { service } = buildService([
    { type: FraudSignalType.OTP_FAILED, severity: FraudSeverity.LOW, createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000) }
  ]);
  const low = await service.evaluateBorrower('tenant_1', 'borrower_1');
  assert.equal(low.aggregate.fraudLevel, FraudLevel.NONE);

  assert.equal(FraudScoringService.toFraudLevel(149), FraudLevel.NONE);
  assert.equal(FraudScoringService.toFraudLevel(150), FraudLevel.LOW);
  assert.equal(FraudScoringService.toFraudLevel(300), FraudLevel.MEDIUM);
  assert.equal(FraudScoringService.toFraudLevel(500), FraudLevel.HIGH);
  assert.equal(FraudScoringService.toFraudLevel(700), FraudLevel.SEVERE);
});
