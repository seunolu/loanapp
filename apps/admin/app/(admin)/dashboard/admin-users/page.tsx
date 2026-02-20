'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, UserPlus, Users } from 'lucide-react';

import {
  createTenantAdminUser,
  listTenantAdminUsers,
  resetTenantAdminUserPassword,
  type TenantAdminRole,
  updateTenantAdminUser
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { PageShell } from '@/src/ui/PageShell';
import { Select } from '@/src/ui/Select';

const ROLE_OPTIONS: TenantAdminRole[] = [
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'OPS',
  'RISK_MANAGER',
  'COLLECTIONS',
  'CREDIT_OFFICER',
  'SYSTEM'
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function AdminUsersPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { role, token } = useAuth();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | TenantAdminRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<TenantAdminRole>('CREDIT_OFFICER');
  const [createPassword, setCreatePassword] = useState('');
  const [lastTemporaryPassword, setLastTemporaryPassword] = useState<{ email: string; password: string } | null>(null);

  const canManage = role === 'SUPER_ADMIN' || role === 'SYSTEM' || role === 'TENANT_ADMIN';
  const currentAdminId = useMemo(() => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { sub?: string };
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }, [token]);

  const usersQuery = useQuery({
    queryKey: ['admin', 'tenant-admin-users', query, roleFilter, statusFilter],
    queryFn: () =>
      listTenantAdminUsers({
        query: query.trim() || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE'
      })
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createTenantAdminUser({
        email: createEmail.trim(),
        role: createRole,
        password: createPassword.trim() || undefined
      }),
    onSuccess: async (result) => {
      setCreateOpen(false);
      setCreateEmail('');
      setCreateRole('CREDIT_OFFICER');
      setCreatePassword('');
      setLastTemporaryPassword(
        result.temporaryPassword ? { email: result.user.email, password: result.temporaryPassword } : null
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tenant-admin-users'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; role?: TenantAdminRole; isActive?: boolean }) => updateTenantAdminUser(input.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tenant-admin-users'] });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => resetTenantAdminUserPassword(id),
    onSuccess: async (result) => {
      setLastTemporaryPassword({ email: result.user.email, password: result.temporaryPassword });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tenant-admin-users'] });
    }
  });

  const stats = useMemo(() => {
    const rows = usersQuery.data ?? [];
    return {
      total: rows.length,
      active: rows.filter((item) => item.isActive).length,
      superAdmins: rows.filter((item) => item.role === 'SUPER_ADMIN').length
    };
  }, [usersQuery.data]);

  return (
    <PageShell
      title="Admin Users"
      subtitle="Manage tenant administrator accounts, role assignment, and account suspension controls."
      className="max-w-screen-2xl"
      actions={
        canManage ? (
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Admin User
          </Button>
        ) : null
      }
    >
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Admins</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Shield className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Active Accounts</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Shield className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Super Admins</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.superAdmins}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {lastTemporaryPassword ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-semibold text-amber-800">Temporary password generated</p>
            <p className="text-xs text-amber-700">User: {lastTemporaryPassword.email}</p>
            <p className="rounded-md bg-white px-3 py-2 font-mono text-sm text-slate-900">
              {lastTemporaryPassword.password}
            </p>
            <p className="text-xs text-amber-700">Share it securely once. It is not shown again.</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Search by email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'ALL' | TenantAdminRole)}>
              <option value="ALL">All roles</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED')}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-slate-500">
                      Loading admin users...
                    </td>
                  </tr>
                ) : null}

                {usersQuery.isError ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-red-600">
                      {usersQuery.error instanceof Error ? usersQuery.error.message : 'Failed to load admin users.'}
                    </td>
                  </tr>
                ) : null}

                {!usersQuery.isLoading && !usersQuery.isError && (usersQuery.data?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-slate-500">
                      No admin users found for this tenant.
                    </td>
                  </tr>
                ) : null}

                {!usersQuery.isLoading && !usersQuery.isError
                  ? usersQuery.data?.map((user) => {
                      const isSelf = Boolean(currentAdminId && user.id === currentAdminId);
                      return (
                      <tr className="border-b border-slate-100" key={user.id}>
                        <td className="px-5 py-3 font-medium text-slate-900">{user.email}</td>
                        <td className="px-5 py-3">
                          {canManage ? (
                            <Select
                              className="h-9"
                              disabled={isSelf}
                              value={user.role}
                              onChange={(event) => {
                                void updateMutation.mutate({
                                  id: user.id,
                                  role: event.target.value as TenantAdminRole
                                });
                              }}
                            >
                              {ROLE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <span>{user.role}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={user.isActive ? 'success' : 'warning'}>{user.isActive ? 'Active' : 'Suspended'}</Badge>
                        </td>
                        <td className="px-5 py-3 text-slate-700">{formatDate(user.createdAt)}</td>
                        <td className="px-5 py-3 text-right">
                          {canManage ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={resetPasswordMutation.isPending}
                                onClick={() => {
                                  void resetPasswordMutation.mutate(user.id);
                                }}
                              >
                                Reset Password
                              </Button>
                              <Button
                                size="sm"
                                variant={user.isActive ? 'danger' : 'secondary'}
                                disabled={updateMutation.isPending || isSelf}
                                title={isSelf ? 'You cannot suspend your own account.' : undefined}
                                onClick={() => {
                                  void updateMutation.mutate({ id: user.id, isActive: !user.isActive });
                                }}
                              >
                                {user.isActive ? 'Suspend' : 'Activate'}
                              </Button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Create Admin User</h2>
              <p className="mt-1 text-sm text-slate-600">Add a tenant admin account and assign the initial role.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Email" type="email" value={createEmail} onChange={(event) => setCreateEmail(event.target.value)} />
              <Select label="Role" value={createRole} onChange={(event) => setCreateRole(event.target.value as TenantAdminRole)}>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <Input
                label="Password (optional)"
                type="password"
                placeholder="Leave blank to auto-generate temporary password"
                value={createPassword}
                onChange={(event) => setCreatePassword(event.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  loading={createMutation.isPending}
                  disabled={createMutation.isPending || !createEmail.trim()}
                  onClick={() => createMutation.mutate()}
                >
                  Create User
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}
