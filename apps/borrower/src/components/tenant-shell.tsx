'use client';

import Link from 'next/link';
import { useState } from 'react';
import { logoutBorrowerSession } from '@/src/lib/api';
import { useTenantConfig } from '@/src/features/tenant/hooks/use-tenant-config';

export function TenantShell({
  slug,
  title,
  children
}: {
  slug: string;
  title: string;
  children: React.ReactNode;
}) {
  const configQuery = useTenantConfig(slug);
  const branding = configQuery.data?.branding;
  const displayName = branding?.displayName ?? slug;
  const primary = branding?.primaryColor ?? '#0f766e';
  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutBorrowerSession();
    } catch {
      // noop
    } finally {
      window.location.href = `/l/${slug}/login`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border" style={{ borderTop: `4px solid ${primary}` }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link className="font-semibold" href={`/l/${slug}`}>
            {displayName}
          </Link>
          <nav className="flex gap-3 text-sm text-muted-foreground">
            <Link href={`/l/${slug}/login`}>Login</Link>
            <Link href={`/l/${slug}/profile`}>Profile</Link>
            <Link href={`/l/${slug}/apply`}>Apply</Link>
            <Link href={`/l/${slug}/offer`}>Offer</Link>
            <Link href={`/l/${slug}/loan`}>Loan</Link>
            <Link href={`/l/${slug}/repay`}>Repay</Link>
            <button className="text-muted-foreground" disabled={loggingOut} onClick={onLogout} type="button">
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
        {children}
      </main>
    </div>
  );
}
