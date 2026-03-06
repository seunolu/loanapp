import type { BadgeTone } from '../../ui';

export type NotificationStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'READ';

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  status: NotificationStatus;
  statusTone: BadgeTone;
  channel: string;
  templateKey: string | null;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
  dataJson: unknown;
};

export type NotificationsResponse = {
  items: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
};
