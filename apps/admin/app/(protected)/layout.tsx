'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { AdminShell } from '@/src/components/layout/admin-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
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
    return <div className="p-6 text-sm text-slate-500">Loading...</div>;
  }

  return <AdminShell>{children}</AdminShell>;
}
