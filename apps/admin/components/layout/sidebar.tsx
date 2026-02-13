'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hasPermission } from '@/lib/auth/permissions';
import { NAV_ITEMS } from '@/components/layout/nav-items';
import { useAuth } from '@/components/auth/auth-context';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { auth } = useAuth();

  return (
    <aside className="w-64 border-r border-border bg-card p-4">
      <div className="mb-6 text-sm font-semibold">LoanApp Admin</div>
      <nav className="space-y-1">
        {NAV_ITEMS.filter((item) => !item.permission || hasPermission(auth.permissions, item.permission)).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
          <Link
            className={cn(
              'block rounded-md px-3 py-2 text-sm',
              active ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted'
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
          );
        })}
      </nav>
    </aside>
  );
}
