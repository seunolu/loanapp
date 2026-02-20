import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { AdminAuditsService } from '../src/modules/admin-loan-applications/admin-audits.service';
import { AdminLedgerService } from '../src/modules/admin-loan-applications/admin-ledger.service';
import { TenantScopedPrismaService } from '../src/common/tenant/tenant-scoped-prisma.service';

test('CASE 1 - borrower isolation returns 404 for cross-tenant loan lookup', async () => {
  let capturedWhere: unknown = null;
  const prisma = {
    tenantLoanApplication: {
      findFirst: async (args: { where: unknown }) => {
        capturedWhere = args.where;
        return null;
      }
    }
  };
  const tenantContext = {
    requireResolvedTenantId: async () => 'tenant_b'
  };
  const service = new TenantScopedPrismaService(prisma as any, tenantContext as any);

  await assert.rejects(() => service.findTenantLoanApplicationById('loan_from_tenant_a'), (error: unknown) => {
    assert.ok(error instanceof NotFoundException);
    return true;
  });
  assert.deepEqual(capturedWhere, { id: 'loan_from_tenant_a', tenantId: 'tenant_b' });
});

test('CASE 2 - admin isolation list/detail stay tenant-scoped', async () => {
  let findManyWhere: unknown = null;
  let findOneWhere: unknown = null;
  const prisma = {
    tenantLoanApplication: {
      findMany: async (args: { where: unknown }) => {
        findManyWhere = args.where;
        return [{ id: 'loan_a', tenantId: 'tenant_a' }];
      },
      findFirst: async (args: { where: unknown }) => {
        findOneWhere = args.where;
        return null;
      }
    }
  };
  const tenantContext = {
    requireResolvedTenantId: async () => 'tenant_a'
  };
  const service = new TenantScopedPrismaService(prisma as any, tenantContext as any);

  const list = await service.findManyTenantLoanApplications();
  assert.equal(list.length, 1);
  assert.equal((list[0] as any).tenantId, 'tenant_a');
  assert.deepEqual(findManyWhere, { tenantId: 'tenant_a' });

  await assert.rejects(() => service.findTenantLoanApplicationById('loan_b'), (error: unknown) => {
    assert.ok(error instanceof NotFoundException);
    return true;
  });
  assert.deepEqual(findOneWhere, { id: 'loan_b', tenantId: 'tenant_a' });
});

test('CASE 3 - audit isolation only returns current tenant rows', async () => {
  let capturedWhere: unknown = null;
  const prisma = {
    auditLog: {
      findMany: async (args: { where: unknown }) => {
        capturedWhere = args.where;
        return [
          {
            id: 'audit_a',
            createdAt: new Date('2026-02-18T00:00:00.000Z'),
            actorType: 'TENANT_ADMIN',
            actorId: 'admin_a',
            action: 'TEST',
            event: null,
            entityType: 'Loan',
            entity: null,
            entityId: 'loan_a',
            requestId: 'req_1',
            ip: null,
            userAgent: null
          }
        ];
      },
      count: async () => 1
    }
  };
  const service = new AdminAuditsService(prisma as any, { log: async () => undefined } as any);
  const admin = { tenantId: 'tenant_a', role: 'OPS', adminId: 'admin_a' } as any;

  const result = await service.list(admin, {
    page: 1,
    pageSize: 25,
    sort: '-createdAt'
  } as any);

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.id, 'audit_a');
  assert.deepEqual((capturedWhere as any)?.tenantId, 'tenant_a');
});

test('CASE 4 - ledger isolation uses principal tenant for export/list path', async () => {
  let captured: unknown = null;
  const ledgerService = {
    listEntries: async (input: unknown) => {
      captured = input;
      return { total: 1, items: [{ id: 'entry_a' }] };
    }
  };
  const service = new AdminLedgerService(ledgerService as any, { log: async () => undefined } as any);
  const admin = { tenantId: 'tenant_a', role: 'OPS', adminId: 'admin_a' } as any;

  const result = await service.listEntries(admin, { limit: 10 });
  assert.equal(result.total, 1);
  assert.deepEqual(captured, {
    tenantId: 'tenant_a',
    from: undefined,
    to: undefined,
    referenceType: undefined,
    referenceId: undefined,
    limit: 10,
    offset: undefined
  });
});

