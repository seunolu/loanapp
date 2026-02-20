'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, FileCode2, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { activateRiskPolicy, createRiskPolicy, listRiskPolicies, type RiskPolicy } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { PageShell } from '@/src/ui/PageShell';
import { Textarea } from '@/src/ui/Textarea';

const DEFAULT_POLICY_JSON = JSON.stringify(
  {
    weights: {
      employmentStatusWeight: 20,
      incomeBandWeight: 20,
      repaymentHistoryWeight: 25,
      deviceTrustWeight: 10,
      kycLevelWeight: 25
    },
    thresholds: {
      approveMinScore: 700,
      reviewMinScore: 550
    },
    rules: {
      hardDeclines: [],
      softFlags: []
    }
  },
  null,
  2
);

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function RiskPoliciesPage(): React.JSX.Element {
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [name, setName] = useState('default');
  const [jsonText, setJsonText] = useState(DEFAULT_POLICY_JSON);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const policiesQuery = useQuery({
    queryKey: ['admin', 'risk', 'policies', tenantId],
    queryFn: () => listRiskPolicies(),
    enabled: Boolean(token && tenantId)
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let configJson: unknown;
      try {
        configJson = JSON.parse(jsonText);
        setJsonError(null);
      } catch {
        setJsonError('Invalid JSON structure. Check commas, quotes, and bracket pairing.');
        throw new Error('Policy JSON is invalid.');
      }
      return createRiskPolicy({ name: name.trim(), configJson });
    },
    onSuccess: async () => {
      toast.success('New policy version created.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'risk', 'policies', tenantId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not create policy version.');
    }
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateRiskPolicy(id),
    onSuccess: async () => {
      toast.success('Policy activated.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'risk', 'policies', tenantId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not activate policy.');
    }
  });

  const grouped = useMemo(() => {
    const map = new Map<string, RiskPolicy[]>();
    for (const item of policiesQuery.data ?? []) {
      const list = map.get(item.name) ?? [];
      list.push(item);
      map.set(item.name, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => b.version - a.version);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [policiesQuery.data]);

  const summary = useMemo(() => {
    const all = policiesQuery.data ?? [];
    const active = all.filter((item) => item.isActive);
    const latest = [...all].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
    return {
      totalVersions: all.length,
      policyFamilies: grouped.length,
      activeCount: active.length,
      latestCreatedAt: latest?.createdAt ?? null
    };
  }, [grouped.length, policiesQuery.data]);

  return (
    <PageShell
      title="Risk Policies"
      subtitle="Version, activate, and govern underwriting policy configuration with full traceability."
      className="max-w-screen-2xl"
      actions={
        <Button
          variant="secondary"
          onClick={() => {
            void policiesQuery.refetch();
          }}
        >
          Refresh
        </Button>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-start gap-3 py-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Policies</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.activeCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 py-5">
            <Sparkles className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Policy Families</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.policyFamilies}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 py-5">
            <FileCode2 className="mt-0.5 h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Versions</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalVersions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 py-5">
            <Clock3 className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last Updated</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {summary.latestCreatedAt ? formatDate(summary.latestCreatedAt) : 'No policies yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Create New Policy Version</h2>
            <p className="mt-1 text-sm text-slate-600">
              Publish a new configuration version under an existing policy family or create a new family.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Policy Family Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. default"
              hint="Using the same name creates a higher version in that family."
            />

            <Textarea
              label="Policy Configuration (JSON)"
              className="min-h-[320px] font-mono text-xs"
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
            />

            {jsonError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{jsonError}</div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setJsonText(DEFAULT_POLICY_JSON);
                  setJsonError(null);
                }}
              >
                Reset Template
              </Button>
              <Button
                disabled={createMutation.isPending || !name.trim()}
                loading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create Version
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Governance Notes</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>Keep approval thresholds aligned with current portfolio risk appetite.</p>
            <p>Activate only one version after validation and stakeholder review.</p>
            <p>Use clear family names to separate retail, payroll, and SME policy logic.</p>
            <p>All versions remain traceable for audit and performance backtesting.</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Policy Versions</h2>
          </CardHeader>
          <CardContent className="p-0">
            {policiesQuery.isLoading ? (
              <div className="p-6 text-sm text-slate-500">Loading policy registry...</div>
            ) : null}

            {policiesQuery.isError ? (
              <div className="p-6">
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {policiesQuery.error instanceof Error ? policiesQuery.error.message : 'Failed to load risk policies.'}
                </div>
              </div>
            ) : null}

            {!policiesQuery.isLoading && !policiesQuery.isError && grouped.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No risk policies yet. Create your first version above.</div>
            ) : null}

            {!policiesQuery.isLoading && !policiesQuery.isError
              ? grouped.map(([policyName, items]) => (
                  <div className="border-t border-slate-200 first:border-t-0" key={policyName}>
                    <div className="flex items-center justify-between bg-slate-50 px-5 py-3">
                      <p className="font-medium text-slate-900">{policyName}</p>
                      <Badge variant="info">{items.length} version{items.length > 1 ? 's' : ''}</Badge>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-5 py-3 text-left">Version</th>
                            <th className="px-5 py-3 text-left">Status</th>
                            <th className="px-5 py-3 text-left">Created</th>
                            <th className="px-5 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr className="border-b border-slate-100 last:border-b-0" key={item.id}>
                              <td className="px-5 py-3 font-medium text-slate-900">v{item.version}</td>
                              <td className="px-5 py-3">
                                <Badge variant={item.isActive ? 'success' : 'neutral'}>
                                  {item.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="px-5 py-3 text-slate-700">{formatDate(item.createdAt)}</td>
                              <td className="px-5 py-3 text-right">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={item.isActive || activateMutation.isPending}
                                  onClick={() => activateMutation.mutate(item.id)}
                                >
                                  Activate
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
