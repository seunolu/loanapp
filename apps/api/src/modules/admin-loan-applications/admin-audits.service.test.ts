import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdminAuditsService, sanitizeCsvCell } from './admin-audits.service';

test('sanitizeCsvCell prevents CSV injection', () => {
  assert.equal(sanitizeCsvCell('=1+1'), "'=1+1");
  assert.equal(sanitizeCsvCell('+cmd'), "'+cmd");
  assert.equal(sanitizeCsvCell('-10'), "'-10");
  assert.equal(sanitizeCsvCell('@evil'), "'@evil");
  assert.equal(sanitizeCsvCell('safe'), 'safe');
});

test('list enforces tenant scoping in where clause', async () => {
  let capturedWhere: unknown;
  const service = new AdminAuditsService(
    {
      auditLog: {
        findMany: async ({ where }: { where: unknown }) => {
          capturedWhere = where;
          return [];
        },
        count: async () => 0
      }
    } as any,
    {} as any
  );

  await service.list(
    {
      adminId: 'admin_1',
      tenantId: 'tenant_1',
      email: 'ops@example.com',
      role: 'OPS'
    } as any,
    { page: 1, pageSize: 25, sort: '-createdAt' } as any
  );

  assert.equal((capturedWhere as { tenantId?: string }).tenantId, 'tenant_1');
});

test('list applies OPS role filter for operational actions', async () => {
  let capturedWhere: any = null;
  const service = new AdminAuditsService(
    {
      auditLog: {
        findMany: async ({ where }: { where: unknown }) => {
          capturedWhere = where;
          return [];
        },
        count: async () => 0
      },
      tenantLoanApplicationEvent: {
        findMany: async () => []
      }
    } as any,
    {} as any
  );

  await service.list(
    {
      adminId: 'ops_1',
      tenantId: 'tenant_1',
      email: 'ops@example.com',
      role: 'OPS'
    } as any,
    { page: 1, pageSize: 25, sort: '-createdAt' } as any
  );

  assert.equal(Array.isArray(capturedWhere.AND), true);
  const roleScope = capturedWhere.AND[1];
  assert.equal(Array.isArray(roleScope.OR), true);
  assert.ok(roleScope.OR.some((item: any) => String(item.action?.startsWith).toLowerCase() === 'disbursement'));
});
