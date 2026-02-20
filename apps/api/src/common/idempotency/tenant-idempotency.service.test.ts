import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConflictException } from '@nestjs/common';
import { IdempotencyStatus } from '@prisma/client';
import { TenantIdempotencyService } from './tenant-idempotency.service';

test('withIdempotency returns cached response for completed key', async () => {
  const service = new TenantIdempotencyService({
    idempotencyKey: {
      findUnique: async () => ({
        id: 'idemp_1',
        status: IdempotencyStatus.COMPLETED,
        response: { ok: true }
      })
    }
  } as any, { increment: () => undefined } as any);

  const result = await service.withIdempotency({
    tenantId: 'tenant_1',
    scope: 'REPAYMENT',
    key: 'abc',
    fn: async () => ({ ok: false })
  });

  assert.deepEqual(result, { ok: true });
});

test('withIdempotency throws conflict when key is in progress', async () => {
  const service = new TenantIdempotencyService({
    idempotencyKey: {
      findUnique: async () => ({
        id: 'idemp_1',
        status: IdempotencyStatus.PENDING,
        response: null
      })
    }
  } as any, { increment: () => undefined } as any);

  await assert.rejects(
    () =>
      service.withIdempotency({
        tenantId: 'tenant_1',
        scope: 'DISBURSEMENT',
        key: 'abc',
        fn: async () => ({ ok: true })
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      return true;
    }
  );
});
