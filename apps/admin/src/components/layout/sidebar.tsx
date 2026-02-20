'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  ClipboardList,
  FileBarChart2,
  FolderKanban,
  Gauge,
  HandCoins,
  Repeat,
  Landmark,
  Scale,
  Users2,
  Settings,
  ShieldAlert,
  Siren,
  Loader2,
  Wallet,
  Workflow
} from 'lucide-react';

import type { AdminActorRole } from '@/src/lib/api';
import { getAdminNav } from '@/src/lib/navigation';
import { useTenant } from '@/src/providers/tenant-provider';
import { cn } from '@/src/ui/cn';

type SidebarProps = {
  role: AdminActorRole | null;
  collapsed: boolean;
  onNavigate?: () => void;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NAV_ICONS = {
  dashboard: Gauge,
  portfolio: FileBarChart2,
  applications: ClipboardList,
  products: Briefcase,
  disbursements: Wallet,
  repayments: HandCoins,
  mandates: Repeat,
  collections: Siren,
  reports: FileBarChart2,
  risk: ShieldAlert,
  fraud: AlertTriangle,
  treasury: Landmark,
  operations: Workflow,
  jobs: FolderKanban,
  adminUsers: Users2,
  support: Scale,
  compliance: Building2,
  settings: Settings
} as const;

export function Sidebar({ role, collapsed, onNavigate }: SidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const nav = getAdminNav(role);
  const { lenderTitle } = useTenant();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200',
        collapsed ? 'w-20' : 'w-[260px]'
      )}
    >
      <div className="border-b border-slate-200 px-4 py-4">
        <p className={cn('text-sm font-semibold text-slate-900', collapsed && 'text-center')}>LoanApp Admin</p>
        {!collapsed ? <p className="mt-1 truncate text-xs text-slate-500">{lenderTitle || 'Tenant Workspace'}</p> : null}
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const Icon = NAV_ICONS[item.key];
          const isPending = pendingHref === item.href;
          return (
          <Link
            className={cn(
              'group flex items-center rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:border-slate-200 hover:bg-slate-50',
              isActive(pathname, item.href) ? 'border-blue-100 bg-blue-50 text-blue-700 shadow-sm' : '',
              isPending ? 'border-slate-200 bg-slate-50 text-slate-900' : '',
              collapsed ? 'justify-center' : 'gap-2.5'
            )}
            href={item.href}
            key={item.key}
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              setPendingHref(item.href);
              onNavigate?.();
            }}
            title={collapsed ? item.label : undefined}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 text-slate-500 transition-colors',
                  isActive(pathname, item.href) ? 'text-blue-600' : 'group-hover:text-slate-700'
                )}
              />
            )}
            {!collapsed ? <span>{item.label}</span> : null}
            {isPending && !collapsed ? <span className="ml-auto text-xs text-slate-500">Loading...</span> : null}
          </Link>
          );
        })}
      </nav>
    </aside>
  );
}
