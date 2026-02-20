import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { computeCaseSlaDueAt, canTransitionCase, CaseManagementService } from './case-management.service';

test('SLA computation works by priority', () => {
  const now = new Date('2026-02-18T00:00:00.000Z');
  assert.equal(computeCaseSlaDueAt('LOW', now).toISOString(), '2026-02-25T00:00:00.000Z');
  assert.equal(computeCaseSlaDueAt('MEDIUM', now).toISOString(), '2026-02-21T00:00:00.000Z');
  assert.equal(computeCaseSlaDueAt('HIGH', now).toISOString(), '2026-02-19T00:00:00.000Z');
  assert.equal(computeCaseSlaDueAt('URGENT', now).toISOString(), '2026-02-18T06:00:00.000Z');
});

test('transition matrix validation works', () => {
  assert.equal(canTransitionCase('OPEN', 'IN_REVIEW'), true);
  assert.equal(canTransitionCase('OPEN', 'RESOLVED'), false);
  assert.equal(canTransitionCase('RESOLVED', 'CLOSED'), true);
  assert.equal(canTransitionCase('CLOSED', 'OPEN'), false);
});

test('RBAC forbids CREDIT_OFFICER from closing case', async () => {
  const service = new CaseManagementService({} as any, {} as any, {} as any);
  await assert.rejects(
    () =>
      service.transitionCase(
        {
          tenantId: 'tenant_1',
          adminId: 'admin_1',
          role: 'CREDIT_OFFICER'
        } as any,
        'case_1',
        { toStatus: 'CLOSED' }
      ),
    (error: unknown) => error instanceof ForbiddenException
  );
});

test('overdue scheduler dedup skips recently notified cases', async () => {
  let notifications = 0;
  const service = new CaseManagementService(
    {
      tenant: { findMany: async () => [{ id: 'tenant_1' }] },
      case: {
        findMany: async () => [
          {
            id: 'case_1',
            tenantId: 'tenant_1',
            status: 'OPEN',
            slaDueAt: new Date('2026-02-17T00:00:00.000Z'),
            lastOverdueNotifiedAt: new Date('2026-02-18T11:00:00.000Z'),
            assignedToAdminUserId: 'admin_1'
          }
        ]
      },
      $transaction: async (fn: (tx: any) => Promise<void>) =>
        fn({
          case: {
            findFirst: async () => ({
              id: 'case_1',
              tenantId: 'tenant_1',
              status: 'OPEN',
              slaDueAt: new Date('2026-02-17T00:00:00.000Z'),
              lastOverdueNotifiedAt: new Date('2026-02-18T11:00:00.000Z'),
              assignedToAdminUserId: 'admin_1'
            }),
            update: async () => ({})
          },
          tenantAdminUser: { findMany: async () => [] },
          notification: { findUnique: async () => null, create: async () => ({ id: 'n1' }) },
          notificationOutbox: { upsert: async () => ({}) }
        })
    } as any,
    {} as any,
    {
      createNotification: async () => {
        notifications += 1;
        return { notificationId: 'n1', reused: false };
      }
    } as any
  );

  const result = await service.processOverdueCases(new Date('2026-02-18T12:00:00.000Z'));
  assert.equal(result.scanned, 1);
  assert.equal(notifications, 0);
});

test('borrower case detail excludes INTERNAL messages', async () => {
  let captured: any = null;
  const service = new CaseManagementService(
    {
      case: {
        findFirst: async (args: any) => {
          captured = args;
          return { id: 'case_1', tenantId: 'tenant_1', borrowerId: 'borrower_1', messages: [], history: [] };
        }
      }
    } as any,
    {} as any,
    {} as any
  );

  await service.getBorrowerCase(
    {
      tenantId: 'tenant_1',
      borrowerId: 'borrower_1'
    } as any,
    'case_1'
  );

  assert.equal(captured.where.tenantId, 'tenant_1');
  assert.equal(captured.where.borrowerId, 'borrower_1');
  assert.equal(captured.include.messages.where.visibility, 'BORROWER');
});

test('borrower cannot read another borrower case', async () => {
  const service = new CaseManagementService(
    {
      case: {
        findFirst: async () => null
      }
    } as any,
    {} as any,
    {} as any
  );

  await assert.rejects(
    () =>
      service.getBorrowerCase(
        {
          tenantId: 'tenant_1',
          borrowerId: 'borrower_1'
        } as any,
        'case_foreign'
      ),
    (error: unknown) => error instanceof NotFoundException
  );
});

test('borrower cannot message CLOSED or REJECTED case', async () => {
  const service = new CaseManagementService(
    {
      $transaction: async (fn: (tx: any) => Promise<any>) =>
        fn({
          case: {
            findFirst: async () => ({
              id: 'case_1',
              tenantId: 'tenant_1',
              borrowerId: 'borrower_1',
              status: 'CLOSED'
            })
          }
        })
    } as any,
    {} as any,
    {} as any
  );

  await assert.rejects(
    () =>
      service.addBorrowerMessage(
        {
          tenantId: 'tenant_1',
          borrowerId: 'borrower_1'
        } as any,
        'case_1',
        { message: 'Any update?' }
      ),
    (error: unknown) => error instanceof BadRequestException
  );
});
