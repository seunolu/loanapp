import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { AdminCollectionsService } from './admin-collections.service';

test('collections endpoints require COLLECTIONS or SUPER_ADMIN role', async () => {
  const service = new AdminCollectionsService(
    {
      tenantLoanApplication: { findMany: async () => [] }
    } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );

  await assert.rejects(
    () =>
      service.listQueue(
        { tenantId: 'tenant-1', adminId: 'admin-1', role: 'OPS', email: 'ops@x.y' } as any,
        { bucket: 'DPD_1_30' }
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    }
  );
});
