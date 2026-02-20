import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { FraudLevel, HoldStatus } from '@prisma/client';
import { FraudRulesService } from './fraud-rules.service';

function buildService() {
  const created: any[] = [];
  let activeHold: any = null;
  const prisma = {
    borrowerHold: {
      findFirst: async ({ where }: { where: { status: HoldStatus } }) => {
        if (where.status === HoldStatus.ACTIVE) return activeHold;
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const row = {
          id: `hold_${created.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        created.push(row);
        activeHold = row;
        return row;
      },
      update: async ({ data }: { data: any }) => {
        activeHold = null;
        return {
          id: 'hold_1',
          tenantId: 'tenant_1',
          borrowerId: 'borrower_1',
          reason: 'hold',
          createdByAdminId: 'admin_1',
          createdBySystem: false,
          status: HoldStatus.RELEASED,
          releaseReason: data.releaseReason,
          releasedAt: data.releasedAt,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    }
  };

  return { service: new FraudRulesService(prisma as any), created, setActiveHold: (row: any) => { activeHold = row; } };
}

test('auto-hold rule is idempotent for SEVERE level', async () => {
  const { service, created } = buildService();

  await service.applyAutoHoldRules({
    tenantId: 'tenant_1',
    borrowerId: 'borrower_1',
    aggregate: { fraudLevel: FraudLevel.SEVERE, flags: [] }
  });
  await service.applyAutoHoldRules({
    tenantId: 'tenant_1',
    borrowerId: 'borrower_1',
    aggregate: { fraudLevel: FraudLevel.SEVERE, flags: [] }
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].status, HoldStatus.ACTIVE);
});

test('auto-hold triggers for HIGH + PAYMENT_VELOCITY_SPIKE', async () => {
  const { service, created } = buildService();
  await service.applyAutoHoldRules({
    tenantId: 'tenant_1',
    borrowerId: 'borrower_2',
    aggregate: { fraudLevel: FraudLevel.HIGH, flags: ['PAYMENT_VELOCITY_SPIKE'] }
  });
  assert.equal(created.length, 1);
});
