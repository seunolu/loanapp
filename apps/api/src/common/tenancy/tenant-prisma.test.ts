import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { withTenant } from './tenant-prisma';

function fakePrisma() {
  const calls: Array<{ op: string; args: Record<string, unknown> }> = [];
  const state = {
    nextFindFirst: { id: 'row_1', tenantId: 'tenant_1' }
  };

  const delegate = {
    findFirst: async (args: Record<string, unknown>) => {
      calls.push({ op: 'findFirst', args });
      return state.nextFindFirst;
    },
    findMany: async (args: Record<string, unknown>) => {
      calls.push({ op: 'findMany', args });
      return [];
    },
    create: async (args: Record<string, unknown>) => {
      calls.push({ op: 'create', args });
      return { id: 'created_1', ...(args.data as Record<string, unknown>) };
    },
    update: async (args: Record<string, unknown>) => {
      calls.push({ op: 'update', args });
      return { id: 'row_1' };
    },
    delete: async (args: Record<string, unknown>) => {
      calls.push({ op: 'delete', args });
      return { id: 'row_1' };
    }
  };

  return {
    prisma: {
      loanProduct: delegate
    } as any,
    calls,
    state
  };
}

test('findManyTenantScoped injects tenantId in where', async () => {
  const f = fakePrisma();
  const tp = withTenant(f.prisma, 'tenant_1');

  await tp.findManyTenantScoped({
    model: 'LoanProduct',
    args: { where: { status: 'ACTIVE' } }
  });

  const call = f.calls.find((item) => item.op === 'findMany');
  assert.ok(call);
  assert.deepEqual(call.args.where, { status: 'ACTIVE', tenantId: 'tenant_1' });
});

test('createTenantScoped injects tenantId into data', async () => {
  const f = fakePrisma();
  const tp = withTenant(f.prisma, 'tenant_1');

  await tp.createTenantScoped({
    model: 'LoanProduct',
    args: { data: { name: 'Product A' } }
  });

  const call = f.calls.find((item) => item.op === 'create');
  assert.ok(call);
  assert.deepEqual(call.args.data, { name: 'Product A', tenantId: 'tenant_1' });
});

test('createTenantScoped rejects cross-tenant mismatch', async () => {
  const f = fakePrisma();
  const tp = withTenant(f.prisma, 'tenant_1');
  await assert.rejects(async () => {
    await tp.createTenantScoped({
      model: 'LoanProduct',
      args: { data: { name: 'Product A', tenantId: 'tenant_2' } }
    });
  }, /Resource not found/);
});

test('updateTenantScoped rejects cross-tenant mismatch in where', async () => {
  const f = fakePrisma();
  const tp = withTenant(f.prisma, 'tenant_1');
  await assert.rejects(async () => {
    await tp.updateTenantScoped({
      model: 'LoanProduct',
      args: { where: { id: 'p_1', tenantId: 'tenant_2' }, data: { name: 'Changed' } }
    });
  }, /Resource not found/);
});

