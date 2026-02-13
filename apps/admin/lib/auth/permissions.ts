export type AdminPermission =
  | 'REPORTS_VIEW'
  | 'PAYMENTS_VIEW'
  | 'ADMIN_USERS_VIEW'
  | 'ADMIN_USERS_MANAGE'
  | 'BORROWERS_VIEW'
  | 'BORROWERS_MANAGE'
  | 'BORROWERS_NOTE'
  | 'BORROWERS_OVERRIDE'
  | 'UNDERWRITING_VIEW'
  | 'UNDERWRITING_EDIT'
  | 'LOANS_VIEW'
  | 'LOANS_APPROVE'
  | 'LOANS_REJECT'
  | 'LOANS_DISBURSE'
  | 'LOANS_REVIEW'
  | 'DISBURSEMENTS_MANAGE'
  | 'AUDIT_VIEW'
  | 'AUDIT_EXPORT'
  | 'JOBS_VIEW'
  | 'JOBS_RETRY'
  | 'LENDER_SETTINGS_EDIT';

const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  OWNER: [
    'REPORTS_VIEW',
    'PAYMENTS_VIEW',
    'ADMIN_USERS_VIEW',
    'ADMIN_USERS_MANAGE',
    'BORROWERS_VIEW',
    'BORROWERS_MANAGE',
    'UNDERWRITING_VIEW',
    'UNDERWRITING_EDIT',
    'LOANS_VIEW',
    'LOANS_APPROVE',
    'LOANS_REJECT',
    'LOANS_REVIEW',
    'LOANS_DISBURSE',
    'DISBURSEMENTS_MANAGE',
    'AUDIT_VIEW',
    'AUDIT_EXPORT',
    'JOBS_VIEW',
    'JOBS_RETRY',
    'LENDER_SETTINGS_EDIT'
  ],
  SUPER_ADMIN: [
    'REPORTS_VIEW',
    'PAYMENTS_VIEW',
    'ADMIN_USERS_VIEW',
    'ADMIN_USERS_MANAGE',
    'BORROWERS_VIEW',
    'BORROWERS_MANAGE',
    'UNDERWRITING_VIEW',
    'UNDERWRITING_EDIT',
    'LOANS_VIEW',
    'LOANS_APPROVE',
    'LOANS_REJECT',
    'LOANS_REVIEW',
    'LOANS_DISBURSE',
    'DISBURSEMENTS_MANAGE',
    'AUDIT_VIEW',
    'AUDIT_EXPORT',
    'JOBS_VIEW',
    'JOBS_RETRY',
    'LENDER_SETTINGS_EDIT'
  ],
  OPS: [
    'BORROWERS_VIEW',
    'BORROWERS_MANAGE',
    'UNDERWRITING_VIEW',
    'UNDERWRITING_EDIT',
    'LOANS_VIEW',
    'LOANS_APPROVE',
    'LOANS_REJECT',
    'LOANS_REVIEW',
    'LOANS_DISBURSE',
    'DISBURSEMENTS_MANAGE',
    'JOBS_VIEW'
  ],
  FINANCE: [
    'REPORTS_VIEW',
    'PAYMENTS_VIEW',
    'LOANS_VIEW',
    'LOANS_APPROVE',
    'LOANS_REJECT',
    'LOANS_REVIEW',
    'LOANS_DISBURSE',
    'DISBURSEMENTS_MANAGE',
    'AUDIT_VIEW',
    'AUDIT_EXPORT'
  ],
  VIEWER: ['REPORTS_VIEW', 'PAYMENTS_VIEW', 'BORROWERS_VIEW', 'UNDERWRITING_VIEW', 'LOANS_VIEW', 'AUDIT_VIEW', 'ADMIN_USERS_VIEW']
};

export function permissionsForRole(role?: string | null): AdminPermission[] {
  if (!role) {
    return [];
  }
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(permissions: string[], permission: AdminPermission): boolean {
  if (permissions.includes(permission)) {
    return true;
  }

  // Backend currently exposes BORROWERS_WRITE; UI splits note/override for tab-level gating.
  if (
    (permission === 'BORROWERS_NOTE' || permission === 'BORROWERS_OVERRIDE' || permission === 'BORROWERS_MANAGE') &&
    permissions.includes('BORROWERS_WRITE')
  ) {
    return true;
  }

  if (permission === 'BORROWERS_VIEW' && permissions.includes('BORROWERS_READ')) {
    return true;
  }

  if (permission === 'LOANS_VIEW' && permissions.includes('LOANS_REVIEW')) {
    return true;
  }

  if (
    (permission === 'LOANS_APPROVE' || permission === 'LOANS_REJECT') &&
    permissions.includes('LOANS_REVIEW')
  ) {
    return true;
  }

  if (permission === 'LOANS_DISBURSE' && permissions.includes('DISBURSEMENTS_MANAGE')) {
    return true;
  }

  if (permission === 'PAYMENTS_VIEW' && permissions.includes('REPORTS_VIEW')) {
    return true;
  }

  return false;
}
