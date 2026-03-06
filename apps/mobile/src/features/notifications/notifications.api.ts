import { authRequest } from '../../auth/auth-client';
import type { NotificationsResponse, NotificationItem, NotificationStatus } from './notifications.types';

type BackendNotificationsResponse = {
  items: {
    id: string;
    title: string;
    body: string;
    status: NotificationStatus;
    channel: string;
    templateKey: string | null;
    createdAt: string;
    updatedAt: string;
    readAt: string | null;
    dataJson: unknown;
  }[];
  total: number;
  limit: number;
  offset: number;
};

function mapStatusTone(status: NotificationStatus): NotificationItem['statusTone'] {
  if (status === 'READ') {
    return 'muted';
  }
  if (status === 'FAILED') {
    return 'danger';
  }
  if (status === 'QUEUED') {
    return 'warning';
  }
  return 'info';
}

function mapNotification(item: BackendNotificationsResponse['items'][number]): NotificationItem {
  return {
    ...item,
    statusTone: mapStatusTone(item.status)
  };
}

export async function listNotifications(input: { limit?: number; offset?: number; status?: NotificationStatus } = {}): Promise<NotificationsResponse> {
  const query = new URLSearchParams();
  if (input.limit) {
    query.set('limit', String(input.limit));
  }
  if (input.offset) {
    query.set('offset', String(input.offset));
  }
  if (input.status) {
    query.set('status', input.status);
  }
  const suffix = query.toString();
  const response = await authRequest<BackendNotificationsResponse>(`/notifications${suffix ? `?${suffix}` : ''}`, {
    method: 'GET',
    requiresAuth: true
  });

  return {
    ...response,
    items: response.items.map(mapNotification)
  };
}

export async function getNotificationDetail(id: string): Promise<NotificationItem> {
  const response = await listNotifications({ limit: 100, offset: 0 });
  const item = response.items.find((entry) => entry.id === id);
  if (!item) {
    throw new Error('Notification not found.');
  }
  return item;
}

export async function markNotificationRead(id: string): Promise<{ id: string; status: NotificationStatus }> {
  return authRequest<{ id: string; status: NotificationStatus }>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    requiresAuth: true
  });
}

export async function markAllNotificationsRead(items: NotificationItem[]): Promise<void> {
  const unread = items.filter((item) => item.status !== 'READ');
  await Promise.all(unread.map((item) => markNotificationRead(item.id)));
}
