import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuditService } from './audit.service';

type ChainState = {
  tenantId: string;
  chainId: string;
  lastHash: string | null;
  lastSequence: number;
  rotatedAt: Date;
};

function createAuditServiceHarness(initial?: Partial<ChainState>) {
  const states = new Map<string, ChainState>();
  const events: Array<Record<string, unknown>> = [];
  const now = new Date();
  const dayKey = `${now.getUTCFullYear()}${`${now.getUTCMonth() + 1}`.padStart(2, '0')}${`${now.getUTCDate()}`.padStart(2, '0')}`;
  const expectedChainId = `tenant:tenant-1:${dayKey}`;

  if (initial) {
    states.set('tenant-1', {
      tenantId: 'tenant-1',
      chainId: initial.chainId ?? expectedChainId,
      lastHash: initial.lastHash ?? null,
      lastSequence: initial.lastSequence ?? 0,
      rotatedAt: initial.rotatedAt ?? now
    });
  }

  const tx = {
    auditChainState: {
      upsert: async ({ where, create }: any) => {
        const existing = states.get(where.tenantId);
        if (existing) return existing;
        const created: ChainState = {
          tenantId: create.tenantId,
          chainId: create.chainId,
          lastHash: create.lastHash ?? null,
          lastSequence: create.lastSequence ?? 0,
          rotatedAt: create.rotatedAt ?? new Date()
        };
        states.set(where.tenantId, created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const current = states.get(where.tenantId);
        if (!current) throw new Error('missing chain state');
        const next: ChainState = {
          ...current,
          chainId: data.chainId ?? current.chainId,
          lastHash: data.lastHash ?? current.lastHash,
          lastSequence: data.lastSequence ?? current.lastSequence,
          rotatedAt: data.rotatedAt ?? current.rotatedAt
        };
        states.set(where.tenantId, next);
        return next;
      }
    },
    auditEvent: {
      create: async ({ data }: any) => {
        events.push(data);
        return data;
      }
    }
  };

  const prisma = {
    $transaction: async (fn: any) => fn(tx)
  };
  const requestContext = {
    get: () => ({
      requestId: 'req-1',
      ip: '127.0.0.1',
      userAgent: 'node-test',
      tenantId: 'tenant-1',
      actorType: 'TENANT_ADMIN',
      actorId: 'admin-1',
      actorRole: 'SUPER_ADMIN'
    })
  };
  const metrics = {
    incrementAuditEvent: () => undefined,
    observeAuditWriteDuration: () => undefined,
    incrementAuditFailure: () => undefined,
    incrementAuditChainRotation: () => undefined
  };
  const request = {
    requestId: 'req-1',
    ip: '127.0.0.1',
    user: { tenantId: 'tenant-1', role: 'SUPER_ADMIN', adminId: 'admin-1' },
    header: (_: string) => 'node-test'
  };

  const service = new AuditService(prisma as any, requestContext as any, metrics as any, request as any);
  return { service, events, states, expectedChainId };
}

test('hash chain appends with increasing sequence and previous hash link', async () => {
  const { service, events, expectedChainId } = createAuditServiceHarness();

  await service.logEvent({
    tenantId: 'tenant-1',
    actorType: 'ADMIN',
    actorId: 'admin-1',
    actorRole: 'SUPER_ADMIN',
    action: 'LOAN_APPLICATION.TRANSITION',
    resourceType: 'LoanApplication',
    resourceId: 'loan-1',
    severity: 'INFO'
  });

  await service.logEvent({
    tenantId: 'tenant-1',
    actorType: 'ADMIN',
    actorId: 'admin-1',
    actorRole: 'SUPER_ADMIN',
    action: 'LOAN_APPLICATION.TRANSITION',
    resourceType: 'LoanApplication',
    resourceId: 'loan-1',
    severity: 'INFO'
  });

  assert.equal(events.length, 2);
  assert.equal(events[0].chainId, expectedChainId);
  assert.equal(events[0].sequence, 1);
  assert.equal(events[1].sequence, 2);
  assert.equal(events[1].prevHash, events[0].hash);
});

test('hash chain rotates when stored chain id is from previous day', async () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yKey = `${yesterday.getUTCFullYear()}${`${yesterday.getUTCMonth() + 1}`.padStart(2, '0')}${`${yesterday.getUTCDate()}`.padStart(2, '0')}`;
  const { service, events, expectedChainId } = createAuditServiceHarness({
    chainId: `tenant:tenant-1:${yKey}`,
    lastHash: 'old-hash',
    lastSequence: 9
  });

  await service.logEvent({
    tenantId: 'tenant-1',
    actorType: 'ADMIN',
    actorId: 'admin-1',
    actorRole: 'SUPER_ADMIN',
    action: 'DATA_ACCESS.READ',
    resourceType: 'LoanApplication',
    resourceId: 'loan-1',
    severity: 'WARNING'
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].chainId, expectedChainId);
  assert.equal(events[0].sequence, 1);
  assert.equal(events[0].prevHash, null);
});
