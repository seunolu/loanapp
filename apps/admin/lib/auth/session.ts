import { permissionsForRole, type AdminPermission } from '@/lib/auth/permissions';

export type SessionUser = {
  adminId: string;
  role: string | null;
  lenderId: string | null;
  email: string | null;
  permissions: AdminPermission[];
};

type JwtPayload = {
  sub?: string;
  role?: string;
  lenderId?: string | null;
  email?: string;
  permissions?: AdminPermission[];
};

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }
    const payload = parts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(Buffer.from(normalized, 'base64').toString('utf-8')) as JwtPayload;
    return parsed;
  } catch {
    return null;
  }
}

export function sessionUserFromToken(token: string): SessionUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.sub) {
    return null;
  }

  const explicitPermissions = Array.isArray(payload.permissions) ? payload.permissions : null;
  return {
    adminId: payload.sub,
    role: payload.role ?? null,
    lenderId: payload.lenderId ?? null,
    email: payload.email ?? null,
    permissions: explicitPermissions ?? permissionsForRole(payload.role)
  };
}
