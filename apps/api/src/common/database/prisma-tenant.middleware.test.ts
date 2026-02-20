import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { prismaTenantMiddleware } from './prisma-tenant.middleware';

test('prisma tenant middleware injects tenantId for scoped reads', async () => {
  const middleware = prismaTenantMiddleware(
    {} as any,
    {
      getTenantId: () => 'tenant-1'
    } as any
  );
  const params: any = {
    model: 'LoanProduct',
    action: 'findMany',
    args: { where: { status: 'ACTIVE' } }
  };
  const result = await middleware(params, async (nextParams) => nextParams.args.where);
  assert.equal(result.tenantId, 'tenant-1');
  assert.equal(result.status, 'ACTIVE');
});

test('prisma tenant middleware rejects cross-tenant read filter', async () => {
  const middleware = prismaTenantMiddleware(
    {} as any,
    {
      getTenantId: () => 'tenant-1'
    } as any
  );
  const params: any = {
    model: 'LoanProduct',
    action: 'findMany',
    args: { where: { tenantId: 'tenant-2' } }
  };
  await assert.rejects(
    () => middleware(params, async () => null),
    (error: any) => error?.response?.code === 'FORBIDDEN'
  );
});

