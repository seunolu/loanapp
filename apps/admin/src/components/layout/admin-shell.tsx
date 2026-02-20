'use client';

import { useState } from 'react';

import { useAuth } from '@/src/providers/auth-provider';
import { Sidebar } from '@/src/components/layout/sidebar';
import { Topbar } from '@/src/components/layout/topbar';
import { Button } from '@/src/ui/Button';

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps): React.JSX.Element {
  const { role } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <div className="flex h-full">
        <div className="hidden md:block">
          <Sidebar collapsed={collapsed} role={role} />
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              aria-label="Close menu"
              className="absolute inset-0 bg-slate-900/30"
              onClick={() => setMobileOpen(false)}
              type="button"
            />
            <div className="relative h-full w-[260px]">
              <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} role={role} />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="sticky top-0 z-30">
            <Topbar onMenuToggle={() => setMobileOpen(true)} />
          </div>
          <div className="sticky top-16 z-20 border-b border-slate-200 bg-white px-6 py-2 md:block">
            <Button onClick={() => setCollapsed((prev) => !prev)} size="sm" variant="ghost">
              {collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            </Button>
          </div>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto w-full max-w-screen-2xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
