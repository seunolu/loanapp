import type { AdminActorRole } from '@/src/lib/api';

export type TenantAdminRole = AdminActorRole | null;

export type AdminNavItem = {
  label: string;
  href: string;
  key:
    | 'dashboard'
    | 'portfolio'
    | 'applications'
    | 'products'
    | 'disbursements'
    | 'repayments'
    | 'mandates'
    | 'collections'
    | 'reports'
    | 'risk'
    | 'fraud'
    | 'treasury'
    | 'operations'
    | 'jobs'
    | 'adminUsers'
    | 'support'
    | 'compliance'
    | 'settings';
};

const BASE_NAV: AdminNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'portfolio', label: 'Portfolio', href: '/dashboard/portfolio' },
  { key: 'applications', label: 'Applications', href: '/dashboard/loan-applications' },
  { key: 'products', label: 'Products', href: '/products' },
  { key: 'disbursements', label: 'Disbursements', href: '/disbursements' },
  { key: 'repayments', label: 'Repayments', href: '/dashboard/payments' },
  { key: 'mandates', label: 'Mandates', href: '/dashboard/mandates' },
  { key: 'collections', label: 'Collections', href: '/dashboard/collections' },
  { key: 'reports', label: 'Reports', href: '/dashboard/reports/portfolio' },
  { key: 'risk', label: 'Risk', href: '/dashboard/risk/policies' },
  { key: 'fraud', label: 'Fraud', href: '/dashboard/fraud' },
  { key: 'treasury', label: 'Treasury', href: '/dashboard/treasury' },
  { key: 'operations', label: 'Operations', href: '/dashboard/operations' },
  { key: 'jobs', label: 'Jobs', href: '/dashboard/jobs' },
  { key: 'adminUsers', label: 'Admin Users', href: '/dashboard/admin-users' },
  { key: 'support', label: 'Support', href: '/dashboard/support' },
  { key: 'compliance', label: 'Compliance', href: '/dashboard/compliance' },
  { key: 'settings', label: 'Settings', href: '/dashboard/settings' }
];

export function getAdminNav(role: TenantAdminRole): AdminNavItem[] {
  const isSuper = role === 'SUPER_ADMIN' || role === 'PLATFORM_SUPER_ADMIN';
  return BASE_NAV.filter((item) => {
    if (item.key === 'collections') {
      return isSuper || role === 'COLLECTIONS';
    }
    if (item.key === 'mandates') {
      return role === 'SUPER_ADMIN' || role === 'OPS' || role === 'SYSTEM';
    }
    if (item.key === 'risk') {
      return isSuper || role === 'RISK_MANAGER';
    }
    if (item.key === 'fraud') {
      return isSuper || role === 'RISK_MANAGER';
    }
    if (item.key === 'operations') {
      return role === 'SUPER_ADMIN' || role === 'SYSTEM';
    }
    if (item.key === 'treasury') {
      return role === 'SUPER_ADMIN' || role === 'OPS' || role === 'SYSTEM';
    }
    if (item.key === 'jobs') {
      return isSuper || role === 'OPS';
    }
    if (item.key === 'adminUsers') {
      return role === 'SUPER_ADMIN' || role === 'SYSTEM' || role === 'TENANT_ADMIN';
    }
    if (item.key === 'support') {
      return role === 'SUPER_ADMIN' || role === 'OPS' || role === 'RISK_MANAGER' || role === 'CREDIT_OFFICER';
    }
    if (item.key === 'portfolio') {
      return (
        role === 'SUPER_ADMIN' ||
        role === 'PLATFORM_SUPER_ADMIN' ||
        role === 'RISK_MANAGER' ||
        role === 'OPS'
      );
    }
    if (item.key === 'compliance') {
      return role === 'SUPER_ADMIN' || role === 'RISK_MANAGER' || role === 'OPS' || role === 'SYSTEM';
    }
    return true;
  });
}
