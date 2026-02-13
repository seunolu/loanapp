'use client';

import { useAuth } from '@/components/auth/auth-context';
import { hasPermission, type AdminPermission } from '@/lib/auth/permissions';

export function RequirePermission({
  permission,
  children,
  fallback
}: {
  permission: AdminPermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { auth, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (!hasPermission(auth.permissions, permission)) {
    return fallback ?? (
      <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
        You do not have permission to view this content.
      </div>
    );
  }
  return <>{children}</>;
}
