import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { MandatesService } from './mandates.service';

function buildService() {
  const prisma = {} as any;
  const auditService = {} as any;
  const jobQueueService = {} as any;
  const promMetricsService = { incrementMandateDebit: () => undefined } as any;
  const gateway = {} as any;
  return new MandatesService(prisma, auditService, jobQueueService, promMetricsService, gateway);
}

test('pause/resume/cancel mandate require OPS or SUPER_ADMIN role', async () => {
  const service = buildService();
  const admin = { adminId: 'a_1', tenantId: 't_1', email: 'x@y.com', role: 'CREDIT_OFFICER' } as const;

  await assert.rejects(
    () => service.pauseMandate(admin as any, 'md_1'),
    (error: unknown) => error instanceof ForbiddenException
  );
  await assert.rejects(
    () => service.resumeMandate(admin as any, 'md_1'),
    (error: unknown) => error instanceof ForbiddenException
  );
  await assert.rejects(
    () => service.cancelMandate(admin as any, 'md_1'),
    (error: unknown) => error instanceof ForbiddenException
  );
});
