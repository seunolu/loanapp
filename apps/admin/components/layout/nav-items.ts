import type { AdminPermission } from '@/lib/auth/permissions';

export type NavItem = {
  href: string;
  label: string;
  permission?: AdminPermission;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', permission: 'REPORTS_VIEW' },
  { href: '/dashboard/overview', label: 'Overview', permission: 'REPORTS_VIEW' },
  { href: '/borrowers', label: 'Borrowers', permission: 'BORROWERS_VIEW' },
  { href: '/applications', label: 'Applications', permission: 'LOANS_VIEW' },
  { href: '/dashboard/products', label: 'Products', permission: 'LOANS_VIEW' },
  { href: '/dashboard/collections', label: 'Collections', permission: 'LOANS_VIEW' },
  { href: '/dashboard/cases', label: 'Cases', permission: 'LOANS_VIEW' },
  { href: '/underwriting', label: 'Underwriting', permission: 'UNDERWRITING_VIEW' },
  { href: '/dashboard/disbursements', label: 'Disbursements', permission: 'LOANS_VIEW' },
  { href: '/dashboard/ledger', label: 'Ledger', permission: 'REPORTS_VIEW' },
  { href: '/dashboard/audits', label: 'Audits', permission: 'AUDIT_VIEW' },
  { href: '/payments', label: 'Payments', permission: 'PAYMENTS_VIEW' },
  { href: '/dashboard/reconciliation', label: 'Reconciliation' },
  { href: '/dashboard/risk/policies', label: 'Risk Policies', permission: 'LOANS_VIEW' },
  { href: '/dashboard/fraud/alerts', label: 'Fraud Alerts', permission: 'LOANS_VIEW' },
  { href: '/dashboard/settlement-batches', label: 'Settlement Batches', permission: 'REPORTS_VIEW' },
  { href: '/dashboard/reports/portfolio', label: 'Reports', permission: 'REPORTS_VIEW' },
  { href: '/jobs', label: 'Jobs', permission: 'JOBS_VIEW' },
  { href: '/audit', label: 'Audit Logs', permission: 'AUDIT_VIEW' },
  { href: '/settings', label: 'Settings', permission: 'LENDER_SETTINGS_EDIT' },
  { href: '/admin-users', label: 'Admin Users', permission: 'ADMIN_USERS_VIEW' }
];
