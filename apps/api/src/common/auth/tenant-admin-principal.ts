export type TenantAdminRoleName = 'SUPER_ADMIN' | 'TENANT_ADMIN';

export type TenantAdminPrincipal = {
  adminId: string;
  tenantId: string;
  email: string;
  role: TenantAdminRoleName;
};

