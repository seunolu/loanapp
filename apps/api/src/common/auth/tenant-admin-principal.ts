export type TenantAdminRoleName =
  | 'CREDIT_OFFICER'
  | 'RISK_MANAGER'
  | 'OPS'
  | 'COLLECTIONS'
  | 'SYSTEM'
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN';

export type TenantAdminPrincipal = {
  adminId: string;
  tenantId: string;
  email: string;
  role: TenantAdminRoleName;
};
