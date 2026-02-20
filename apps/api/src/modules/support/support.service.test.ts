import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { SupportService } from './support.service';

function buildService(prismaOverrides: Record<string, unknown> = {}, ledgerOverrides: Record<string, unknown> = {}) {
  const prisma = {
    supportAction: {
      findFirst: async () => null,
      update: async () => ({})
    },
    supportCase: {
      findFirst: async () => null
    },
    ...prismaOverrides
  };
  const audit = {
    log: async () => undefined
  };
  const ledger = {
    reverseEntry: async () => ({ id: 'entry_1', reused: false }),
    ...ledgerOverrides
  };

  return new SupportService(prisma as any, audit as any, ledger as any);
}

test('policy: requester cannot approve HIGH action', async () => {
  const service = buildService({
    supportAction: {
      findFirst: async () => ({
        id: 'act_1',
        caseId: 'case_1',
        type: 'RESCHEDULE_PLAN',
        risk: 'HIGH',
        status: 'PENDING_APPROVAL',
        payloadJson: {},
        requestedById: 'admin_1',
        approvedById: null
      }),
      update: async () => ({})
    }
  });

  await assert.rejects(
    () =>
      service.approveAction(
        { adminId: 'admin_1', tenantId: 'tenant_1', email: 'ops@example.com', role: 'RISK_MANAGER' },
        'act_1',
        {}
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    }
  );
});

test('policy: approver cannot execute HIGH action', async () => {
  const service = buildService({
    supportAction: {
      findFirst: async () => ({
        id: 'act_2',
        caseId: 'case_1',
        type: 'RESCHEDULE_PLAN',
        risk: 'HIGH',
        status: 'APPROVED',
        payloadJson: {},
        requestedById: 'admin_1',
        approvedById: 'admin_2'
      }),
      update: async () => ({})
    }
  });

  await assert.rejects(
    () =>
      service.executeAction(
        { adminId: 'admin_2', tenantId: 'tenant_1', email: 'ops@example.com', role: 'OPS' },
        'act_2'
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    }
  );
});

test('ledger reversal action executes via compensating entry call', async () => {
  const calls: Array<{ entryId: string; reason: string }> = [];
  const service = buildService(
    {
      supportAction: {
        findFirst: async () => ({
          id: 'act_3',
          caseId: 'case_3',
          type: 'LEDGER_REVERSAL',
          risk: 'CRITICAL',
          status: 'APPROVED',
          payloadJson: { entryId: 'ledger_123' },
          requestedById: 'admin_1',
          approvedById: 'admin_2'
        }),
        update: async ({ data }: { data: { status: string } }) => ({
          id: 'act_3',
          status: data.status
        })
      },
      supportCase: {
        findFirst: async () => ({
          id: 'case_3',
          tenantId: 'tenant_1',
          loanId: 'loan_1',
          borrowerId: 'borrower_1'
        })
      }
    },
    {
      reverseEntry: async (input: { entryId: string; reason: string }) => {
        calls.push({ entryId: input.entryId, reason: input.reason });
        return { id: 'reversal_1', reused: false };
      }
    }
  );

  const result = await service.executeAction(
    { adminId: 'admin_3', tenantId: 'tenant_1', email: 'ops@example.com', role: 'SUPER_ADMIN' },
    'act_3'
  );

  assert.equal((result as { status: string }).status, 'EXECUTED');
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.entryId, 'ledger_123');
});
