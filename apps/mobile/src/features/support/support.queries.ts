import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../providers/auth-provider';
import { useTenant } from '../../tenant/tenant-context';
import { getSupportTicket, listSupportFaq, listSupportTickets } from './support.api';

export const supportKeys = {
  all: ['support'] as const,
  tickets: (tenantSlug: string) => ['support', tenantSlug, 'tickets'] as const,
  ticket: (tenantSlug: string, id: string) => ['support', tenantSlug, 'tickets', id] as const,
  faq: ['support', 'faq'] as const
};

export function useSupportTickets() {
  const { status } = useAuth();
  const { tenantSlug } = useTenant();

  return useQuery({
    queryKey: supportKeys.tickets(tenantSlug || 'default'),
    queryFn: listSupportTickets,
    enabled: status === 'authenticated',
    staleTime: 20_000
  });
}

export function useSupportTicket(id: string) {
  const { status } = useAuth();
  const { tenantSlug } = useTenant();

  return useQuery({
    queryKey: supportKeys.ticket(tenantSlug || 'default', id),
    queryFn: () => getSupportTicket(id),
    enabled: Boolean(id) && status === 'authenticated',
    staleTime: 20_000
  });
}

export function useSupportFaq() {
  return useQuery({
    queryKey: supportKeys.faq,
    queryFn: async () => listSupportFaq(),
    staleTime: Infinity
  });
}
