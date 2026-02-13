'use client';

import { useQuery } from '@tanstack/react-query';
import { getSessionRequest } from '@/lib/api/web-client';
import type { AdminPermission } from '@/lib/auth/permissions';

export type MeResponse = {
  admin: {
    id: string;
    email: string;
    fullName: string | null;
    status: string;
    role: string;
    roleId: string | null;
  };
  lender: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
  permissions: AdminPermission[];
};

export function useMe() {
  return useQuery({
    queryKey: ['admin-me'],
    queryFn: async () => (await getSessionRequest()) as MeResponse,
    retry: false
  });
}
