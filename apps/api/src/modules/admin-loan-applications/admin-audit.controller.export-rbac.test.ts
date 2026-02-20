import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { AdminAuditController } from './admin-audit.controller';

test('non SUPER_ADMIN cannot export another tenant', async () => {
  const prisma = {
    auditEvent: {
      findMany: async () => []
    }
  };
  const controller = new AdminAuditController(prisma as any);
  const admin = {
    role: 'OPS',
    tenantId: 'tenant-ops',
    lenderId: null
  } as any;
  const res = {
    setHeader: () => undefined,
    write: () => undefined,
    end: () => undefined
  } as any;

  await assert.rejects(
    () =>
      controller.exportEvents(
        admin,
        {
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-01-31T23:59:59.999Z',
          tenantId: 'tenant-other'
        },
        res
      ),
    (error: unknown) => error instanceof ForbiddenException
  );
});

