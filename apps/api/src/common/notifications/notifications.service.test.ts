import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import {
  NotificationAudienceType,
  NotificationDeliveryChannel,
  NotificationRecordStatus
} from '@prisma/client';
import { NotificationsService } from './notifications.service';

test('createNotification is idempotent by tenantId + idempotencyKey', async () => {
  const service = new NotificationsService(
    {
      notification: {
        findUnique: async () => ({ id: 'notif_existing' })
      }
    } as any,
    { get: () => 'LoanApp' } as any
  );

  const result = await service.createNotification({
    tenantId: 'tenant_1',
    audienceType: NotificationAudienceType.ADMIN,
    audienceUserId: 'admin_1',
    channel: NotificationDeliveryChannel.IN_APP,
    templateKey: 'LOAN_STATUS_CHANGED',
    title: 'Status changed',
    body: 'Body',
    idempotencyKey: 'loan:1:status:1'
  });

  assert.deepEqual(result, { notificationId: 'notif_existing', reused: true });
});

test('publishLoanStatusChanged creates notifications for borrower and admin audiences', async () => {
  const captured: string[] = [];
  const service = new NotificationsService(
    {
      notification: {
        findUnique: async () => null,
        create: async ({ data }: { data: { idempotencyKey: string } }) => {
          captured.push(data.idempotencyKey);
          return { id: `notif_${captured.length}` };
        }
      },
      notificationOutbox: {
        upsert: async () => null
      }
    } as any,
    { get: () => 'LoanApp' } as any
  );

  await service.publishLoanStatusChanged({
    tenantId: 'tenant_1',
    loanApplicationId: 'loan_1',
    fromStatus: 'SUBMITTED',
    toStatus: 'UNDER_REVIEW',
    historyId: 'hist_1',
    borrowerAudienceUserId: 'borrower_1',
    adminAudienceUserIds: ['admin_1', 'admin_2']
  });

  assert.equal(captured.length, 3);
  assert.ok(captured.some((item) => item.includes(':borrower')));
  assert.ok(captured.some((item) => item.includes(':admin:admin_1')));
  assert.ok(captured.some((item) => item.includes(':admin:admin_2')));
});

test('markAsRead enforces tenant and audience ownership', async () => {
  const service = new NotificationsService(
    {
      notification: {
        findFirst: async () => null
      }
    } as any,
    { get: () => 'LoanApp' } as any
  );

  await assert.rejects(
    () =>
      service.markAsRead('notif_1', {
        type: 'ADMIN',
        principal: {
          adminId: 'admin_1',
          tenantId: 'tenant_1',
          email: 'admin@example.com',
          role: 'OPS'
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      return true;
    }
  );
});

test('listNotifications returns tenant-scoped paginated rows', async () => {
  const service = new NotificationsService(
    {
      $transaction: async () => [
        [
          {
            id: 'notif_1',
            audienceType: NotificationAudienceType.ADMIN,
            audienceUserId: 'admin_1',
            channel: NotificationDeliveryChannel.IN_APP,
            templateKey: 'X',
            title: 't',
            body: 'b',
            dataJson: {},
            status: NotificationRecordStatus.QUEUED,
            createdAt: new Date('2026-02-18T00:00:00.000Z'),
            updatedAt: new Date('2026-02-18T00:00:00.000Z'),
            readAt: null
          }
        ],
        1
      ],
      notification: {
        findMany: async () => [],
        count: async () => 0
      }
    } as any,
    { get: () => 'LoanApp' } as any
  );

  const result = await service.listNotifications(
    {
      type: 'ADMIN',
      principal: {
        adminId: 'admin_1',
        tenantId: 'tenant_1',
        email: 'admin@example.com',
        role: 'OPS'
      }
    },
    { limit: 10, offset: 0 }
  );

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
});
