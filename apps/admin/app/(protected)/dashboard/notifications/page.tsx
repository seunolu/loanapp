'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  listAdminNotifications,
  markAdminNotificationRead,
  type NotificationRecordStatus
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function DashboardNotificationsPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<NotificationRecordStatus | ''>('');

  const notificationsQuery = useQuery({
    queryKey: ['admin', 'notifications', tenantId, status],
    queryFn: () => listAdminNotifications({ limit: 100, status: status || undefined }),
    enabled: Boolean(token && tenantId)
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markAdminNotificationRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', tenantId] });
      toast.success('Notification marked as read');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Failed to mark notification as read')
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <select
          className="rounded border px-2 py-1 text-sm"
          onChange={(event) => setStatus(event.target.value as NotificationRecordStatus | '')}
          value={status}
        >
          <option value="">All statuses</option>
          <option value="QUEUED">QUEUED</option>
          <option value="SENT">SENT</option>
          <option value="FAILED">FAILED</option>
          <option value="READ">READ</option>
        </select>
      </div>

      {notificationsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading notifications...</p>}
      {notificationsQuery.isError && (
        <p className="text-sm text-destructive">
          {notificationsQuery.error instanceof Error
            ? notificationsQuery.error.message
            : 'Failed to load notifications.'}
        </p>
      )}

      {notificationsQuery.data ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Body</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {notificationsQuery.data.items.map((item) => (
                <tr className="border-t" key={item.id}>
                  <td className="px-3 py-2">{item.title}</td>
                  <td className="px-3 py-2">{item.body}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.templateKey}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <Button
                      disabled={item.status === 'READ' || markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate(item.id)}
                      size="sm"
                      variant="outline"
                    >
                      Mark as read
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

