export type AdminRoleName = 'PLATFORM_SUPER_ADMIN' | 'OWNER' | 'SUPER_ADMIN' | 'OPS' | 'FINANCE' | 'VIEWER';

export type AdminPrincipal = {
  adminId: string;
  lenderId: string;
  email: string;
  role: AdminRoleName;
  sessionId: string;
};
