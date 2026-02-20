'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import { PageHeader } from '@/src/components/layout/page-header';
import {
  addSupportNote,
  approveSupportAction,
  closeSupportCase,
  createSupportAction,
  executeSupportAction,
  getSupportCase,
  rejectSupportAction,
  type SupportAction,
  type SupportActionType
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { Select } from '@/src/ui/Select';
import { Textarea } from '@/src/ui/Textarea';

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function canAccessSupport(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'OPS' || role === 'RISK_MANAGER' || role === 'CREDIT_OFFICER';
}

function canApprove(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'RISK_MANAGER' || role === 'OPS';
}

function canExecute(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'OPS';
}

function riskVariant(risk: SupportAction['risk']): 'neutral' | 'warning' | 'danger' {
  if (risk === 'HIGH' || risk === 'CRITICAL') return 'danger';
  if (risk === 'MEDIUM') return 'warning';
  return 'neutral';
}

function statusVariant(status: SupportAction['status']): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'PENDING_APPROVAL') return 'warning';
  if (status === 'APPROVED') return 'info';
  if (status === 'EXECUTED') return 'success';
  if (status === 'FAILED' || status === 'REJECTED') return 'danger';
  return 'neutral';
}

function defaultPayload(type: SupportActionType): string {
  if (type === 'PAUSE_INTEREST') return JSON.stringify({ days: 3 }, null, 2);
  if (type === 'APPLY_WAIVER' || type === 'APPLY_FEE') return JSON.stringify({ amount: 1000 }, null, 2);
  if (type === 'RESCHEDULE_PLAN') return JSON.stringify({ shifts: [] }, null, 2);
  if (type === 'LEDGER_REVERSAL') return JSON.stringify({ entryId: '' }, null, 2);
  if (type === 'NOTE') return JSON.stringify({ note: '' }, null, 2);
  return JSON.stringify({}, null, 2);
}

export default function SupportCaseDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const queryClient = useQueryClient();
  const { token, role } = useAuth();
  const { tenantId } = useTenant();
  const enabled = Boolean(token && tenantId && id);
  const allowed = canAccessSupport(role);

  const [activeTab, setActiveTab] = useState<'actions' | 'notes' | 'timeline'>('actions');
  const [noteBody, setNoteBody] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [actionType, setActionType] = useState<SupportActionType>('PAUSE_INTEREST');
  const [actionReason, setActionReason] = useState('');
  const [actionPayload, setActionPayload] = useState(defaultPayload('PAUSE_INTEREST'));

  const caseQuery = useQuery({
    queryKey: ['admin', 'support', 'case', id],
    queryFn: () => getSupportCase(id),
    enabled: enabled && allowed
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'case', id] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'cases'] });
  };

  const createNoteMutation = useMutation({
    mutationFn: () =>
      addSupportNote(id, {
        body: noteBody.trim(),
        evidenceUrl: evidenceUrl.trim() || undefined
      }),
    onSuccess: async () => {
      setNoteBody('');
      setEvidenceUrl('');
      await refresh();
    }
  });

  const createActionMutation = useMutation({
    mutationFn: async () => {
      let parsedPayload: Record<string, unknown> = {};
      if (actionPayload.trim()) {
        parsedPayload = JSON.parse(actionPayload) as Record<string, unknown>;
      }
      return createSupportAction(id, {
        type: actionType,
        reason: actionReason.trim(),
        payload: parsedPayload
      });
    },
    onSuccess: async () => {
      setActionReason('');
      setActionPayload(defaultPayload(actionType));
      await refresh();
    }
  });

  const approveMutation = useMutation({
    mutationFn: (actionId: string) => approveSupportAction(actionId),
    onSuccess: refresh
  });
  const rejectMutation = useMutation({
    mutationFn: (actionId: string) => rejectSupportAction(actionId, { decisionNote: 'Rejected in support console.' }),
    onSuccess: refresh
  });
  const executeMutation = useMutation({
    mutationFn: (actionId: string) => executeSupportAction(actionId),
    onSuccess: refresh
  });
  const closeMutation = useMutation({
    mutationFn: () => closeSupportCase(id),
    onSuccess: refresh
  });

  const timelineRows = useMemo(() => {
    const supportCase = caseQuery.data;
    if (!supportCase) return [];

    const actionRows = supportCase.actions.map((item) => ({
      id: item.id,
      kind: 'ACTION',
      at: item.executedAt ?? item.decidedAt ?? item.createdAt,
      summary: `${item.type} - ${item.status}`,
      detail: item.reason
    }));
    const noteRows = supportCase.notes.map((item) => ({
      id: item.id,
      kind: 'NOTE',
      at: item.createdAt,
      summary: 'Internal note added',
      detail: item.body
    }));

    return [...actionRows, ...noteRows].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [caseQuery.data]);

  if (!allowed) {
    return (
      <Card>
        <CardContent className="py-5">
          <h1 className="text-lg font-semibold text-slate-900">Not Authorized</h1>
          <p className="mt-1 text-sm text-slate-600">You do not have access to support intervention workflows.</p>
        </CardContent>
      </Card>
    );
  }

  const supportCase = caseQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={supportCase?.title ?? 'Support Case'}
        subtitle={
          supportCase ? (
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant={supportCase.status === 'OPEN' ? 'success' : 'neutral'}>{supportCase.status}</Badge>
              <span className="font-mono text-xs text-slate-600">Case: {supportCase.id}</span>
              {supportCase.loanId ? (
                <Link className="text-sm text-blue-600 hover:underline" href={`/dashboard/loan-applications/${supportCase.loanId}`}>
                  Loan {supportCase.loanId.slice(0, 10)}...
                </Link>
              ) : null}
            </span>
          ) : 'Loading case details...'
        }
        right={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                void caseQuery.refetch();
              }}
              size="sm"
              variant="secondary"
            >
              Refresh
            </Button>
            <Button
              disabled={!supportCase || supportCase.status === 'CLOSED'}
              loading={closeMutation.isPending}
              onClick={() => {
                void closeMutation.mutateAsync();
              }}
              size="sm"
              variant="secondary"
            >
              Close Case
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setActiveTab('actions')} size="sm" variant={activeTab === 'actions' ? 'primary' : 'secondary'}>
          Actions
        </Button>
        <Button onClick={() => setActiveTab('notes')} size="sm" variant={activeTab === 'notes' ? 'primary' : 'secondary'}>
          Notes
        </Button>
        <Button onClick={() => setActiveTab('timeline')} size="sm" variant={activeTab === 'timeline' ? 'primary' : 'secondary'}>
          Timeline
        </Button>
      </div>

      {caseQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">Failed to load support case details.</CardContent>
        </Card>
      ) : null}

      {activeTab === 'actions' && supportCase ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Create Action</h2>
            </CardHeader>
            <CardContent className="space-y-3 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Select
                  label="Action Type"
                  onChange={(event) => {
                    const value = event.target.value as SupportActionType;
                    setActionType(value);
                    setActionPayload(defaultPayload(value));
                  }}
                  value={actionType}
                >
                  <option value="PAUSE_INTEREST">Pause Interest</option>
                  <option value="RESUME_INTEREST">Resume Interest</option>
                  <option value="APPLY_WAIVER">Apply Waiver</option>
                  <option value="APPLY_FEE">Apply Fee</option>
                  <option value="RESCHEDULE_PLAN">Reschedule Plan</option>
                  <option value="LEDGER_REVERSAL">Ledger Reversal</option>
                  <option value="NOTE">Note</option>
                </Select>
                <Input
                  label="Reason"
                  onChange={(event) => setActionReason(event.target.value)}
                  placeholder="Business justification"
                  value={actionReason}
                />
              </div>
              <Textarea
                label="Payload JSON"
                onChange={(event) => setActionPayload(event.target.value)}
                rows={8}
                value={actionPayload}
              />
              <div>
                <Button
                  disabled={!actionReason.trim()}
                  loading={createActionMutation.isPending}
                  onClick={() => {
                    void createActionMutation.mutateAsync();
                  }}
                  size="sm"
                >
                  Create Action
                </Button>
              </div>
            </CardContent>
          </Card>

          {!supportCase.actions.length ? (
            <EmptyState title="No actions yet" description="Create an action request to begin a controlled intervention." />
          ) : (
            <DataTable
              columns={[
                { header: 'Type' },
                { header: 'Risk' },
                { header: 'Status' },
                { header: 'Requested / Approved / Executed' },
                { header: 'Created At' },
                { header: 'Actions', className: 'w-72' }
              ]}
            >
              {supportCase.actions.map((item) => (
                <tr className="hover:bg-slate-50" key={item.id}>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-900">{item.type}</td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <Badge variant={riskVariant(item.risk)}>{item.risk}</Badge>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-xs text-slate-700">
                    <p className="font-mono">Req: {item.requestedById.slice(0, 10)}...</p>
                    <p className="font-mono">Appr: {item.approvedById ? `${item.approvedById.slice(0, 10)}...` : '-'}</p>
                    <p className="font-mono">Exec: {item.executedById ? `${item.executedById.slice(0, 10)}...` : '-'}</p>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                    {DATE_TIME.format(new Date(item.createdAt))}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={item.status !== 'PENDING_APPROVAL' || !canApprove(role)}
                        loading={approveMutation.isPending}
                        onClick={() => {
                          void approveMutation.mutateAsync(item.id);
                        }}
                        size="sm"
                        variant="secondary"
                      >
                        Approve
                      </Button>
                      <Button
                        disabled={item.status !== 'PENDING_APPROVAL' || !canApprove(role)}
                        loading={rejectMutation.isPending}
                        onClick={() => {
                          void rejectMutation.mutateAsync(item.id);
                        }}
                        size="sm"
                        variant="secondary"
                      >
                        Reject
                      </Button>
                      <Button
                        disabled={item.status !== 'APPROVED' || !canExecute(role)}
                        loading={executeMutation.isPending}
                        onClick={() => {
                          void executeMutation.mutateAsync(item.id);
                        }}
                        size="sm"
                      >
                        Execute
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      ) : null}

      {activeTab === 'notes' && supportCase ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">Add Note</h2>
            </CardHeader>
            <CardContent className="space-y-3 py-4">
              <Textarea
                label="Internal Note"
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Add operational context and evidence references."
                rows={5}
                value={noteBody}
              />
              <Input
                label="Evidence URL (optional)"
                onChange={(event) => setEvidenceUrl(event.target.value)}
                placeholder="https://..."
                value={evidenceUrl}
              />
              <div>
                <Button
                  disabled={!noteBody.trim()}
                  loading={createNoteMutation.isPending}
                  onClick={() => {
                    void createNoteMutation.mutateAsync();
                  }}
                  size="sm"
                >
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>

          {!supportCase.notes.length ? (
            <EmptyState title="No notes yet" description="Case notes and evidence links will appear here." />
          ) : (
            <Card>
              <CardContent className="space-y-3 py-4">
                {supportCase.notes.map((item) => (
                  <div className="rounded-xl border border-slate-200 bg-white p-3" key={item.id}>
                    <p className="text-sm text-slate-800">{item.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{DATE_TIME.format(new Date(item.createdAt))}</span>
                      <span className="font-mono">{item.createdById.slice(0, 12)}...</span>
                      {item.evidenceUrl ? (
                        <a
                          className="text-blue-600 hover:underline"
                          href={item.evidenceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Evidence
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {activeTab === 'timeline' && supportCase ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
          </CardHeader>
          <CardContent className="space-y-3 py-4">
            {!timelineRows.length ? (
              <EmptyState title="No timeline activity" description="Action and note history will appear here." />
            ) : (
              timelineRows.map((item) => (
                <div className="rounded-xl border border-slate-200 p-3" key={`${item.kind}_${item.id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={item.kind === 'ACTION' ? 'info' : 'neutral'}>{item.kind}</Badge>
                    <span className="text-xs text-slate-500">{DATE_TIME.format(new Date(item.at))}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{item.summary}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
