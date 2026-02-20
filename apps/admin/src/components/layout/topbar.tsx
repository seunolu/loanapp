'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Building2, LogOut } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Button } from '@/src/ui/Button';

type TopbarProps = {
  onMenuToggle: () => void;
};

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  portfolio: 'Portfolio',
  loan: 'Loan',
  'loan-applications': 'Loan Applications',
  applications: 'Applications',
  overview: 'Overview',
  products: 'Products',
  disbursements: 'Disbursements',
  payments: 'Repayments',
  mandates: 'Mandates',
  collections: 'Collections',
  reports: 'Reports',
  risk: 'Risk',
  fraud: 'Fraud',
  compliance: 'Compliance',
  operations: 'Operations',
  support: 'Support',
  jobs: 'Jobs',
  'admin-users': 'Admin Users',
  settings: 'Settings',
  reconciliation: 'Reconciliation',
  notifications: 'Notifications',
  ledger: 'Ledger'
};

function titleCaseLabel(segment: string): string {
  const sanitized = segment.replace(/-/g, ' ');
  const mapped = LABELS[segment] ?? sanitized;
  return mapped
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

function buildBreadcrumbs(pathname: string): string[] {
  const rawParts = pathname
    .split('/')
    .filter(Boolean)
    .filter((part) => !part.startsWith('(') && !part.endsWith(')'));

  return rawParts.map((part, index) => {
    const previous = rawParts[index - 1];

    if (previous === 'loan-applications') {
      return 'Application';
    }
    if (previous === 'jobs') {
      return 'Job';
    }
    if (previous === 'products') {
      return 'Product';
    }
    if (previous === 'payments') {
      return 'Payment';
    }
    if (previous === 'mandates') {
      return 'Mandate';
    }
    if (previous === 'disbursements') {
      return 'Disbursement';
    }
    if (previous === 'support') {
      return 'Case';
    }

    return titleCaseLabel(part);
  });
}

export function Topbar({ onMenuToggle }: TopbarProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { tenantSlug, lenderTitle, clearTenant } = useTenant();
  const { role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const breadcrumbs = useMemo(() => {
    return buildBreadcrumbs(pathname);
  }, [pathname]);

  const onLogout = () => {
    logout();
    router.replace('/login');
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button className="md:hidden" onClick={onMenuToggle} size="sm" variant="secondary">
            Menu
          </Button>
          <nav className="truncate text-sm text-slate-500">
            {breadcrumbs.join(' / ') || 'Dashboard'}
          </nav>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            {tenantSlug || 'tenant'} - {lenderTitle || 'Workspace'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            {role || 'VIEWER'}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
              onClick={() => setMenuOpen((prev) => !prev)}
              type="button"
            >
              Account
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
            <div
              className={[
                'absolute right-0 z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 transition-all duration-150',
                menuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
              ].join(' ')}
            >
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                onClick={() => {
                  setMenuOpen(false);
                  clearTenant();
                  router.push('/select-tenant');
                }}
                type="button"
              >
                <Building2 className="h-4 w-4" />
                Switch Tenant
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
