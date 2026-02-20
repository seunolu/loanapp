'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const tenant = useTenant();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, router, token]);

  useEffect(() => {
    if (tenant.hydrated && !tenant.tenantId) {
      router.replace('/select-tenant');
    }
  }, [router, tenant.hydrated, tenant.tenantId]);

  if (!hydrated || !token || !tenant.hydrated || !tenant.tenantId) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return children;
}
