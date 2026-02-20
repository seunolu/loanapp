export type AdminRoleName =
  | 'PLATFORM_SUPER_ADMIN'
  | 'OWNER'
  | 'SUPER_ADMIN'
  | 'OPS'
  | 'FINANCE'
  | 'VIEWER'
  | 'CREDIT_OFFICER'
  | 'RISK_MANAGER'
  | 'COLLECTIONS'
  | 'SYSTEM'
  | 'TENANT_ADMIN';

export type AdminPrincipal = {
  adminId: string;
  lenderId: string;
  tenantId: string | null;
  email: string;
  role: AdminRoleName;
  sessionId: string;
};
