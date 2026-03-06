import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../providers/auth-provider';
import { useTenant } from '../../tenant/tenant-context';
import { getNotificationDetail, listNotifications } from './notifications.api';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (tenantSlug: string) => ['notifications', tenantSlug] as const,
  detail: (tenantSlug: string, id: string) => ['notifications', tenantSlug, id] as const
};

export function useNotifications() {
  const { status } = useAuth();
  const { tenantSlug } = useTenant();

  return useQuery({
    queryKey: notificationKeys.list(tenantSlug || 'default'),
    queryFn: () => listNotifications({ limit: 50 }),
    enabled: status === 'authenticated',
    staleTime: 20_000
  });
}

export function useNotificationDetail(id: string) {
  const { status } = useAuth();
  const { tenantSlug } = useTenant();

  return useQuery({
    queryKey: notificationKeys.detail(tenantSlug || 'default', id),
    queryFn: () => getNotificationDetail(id),
    enabled: Boolean(id) && status === 'authenticated',
    staleTime: 20_000
  });
}
