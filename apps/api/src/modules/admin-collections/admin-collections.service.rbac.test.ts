import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { AdminCollectionsService } from './admin-collections.service';

function serviceWithNoopDeps() {
  return new AdminCollectionsService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );
}

test('CREDIT_OFFICER cannot run collections scan', async () => {
  const service = serviceWithNoopDeps();
  await assert.rejects(
    () =>
      service.runCollectionsScan(
        { adminId: 'a1', tenantId: 't1', email: 'c@example.com', role: 'CREDIT_OFFICER' } as any,
        {}
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    }
  );
});

test('CREDIT_OFFICER cannot write off case', async () => {
  const service = serviceWithNoopDeps();
  await assert.rejects(
    () =>
      service.writeOffCase(
        { adminId: 'a1', tenantId: 't1', email: 'c@example.com', role: 'CREDIT_OFFICER' } as any,
        'case_1',
        { note: 'write off' }
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    }
  );
});
