'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  accrueInterest,
  approveLoanIdentityManualReview,
  addLoanApplicationHold,
  addCollectionActivity,
  createCase,
  type AdminLoanApplicationStatus,
  createManualFraudFlag,
  decideLoanApplication,
  disburseLoanApplication,
  generateLoanSchedule,
  getLoanApplication,
  getLoanApplicationRisk,
  listLoanApplicationRiskEvaluations,
  markReadyForDisbursement,
  listInterestAudit,
  listAuditTrail,
  listLoanRepayments,
  listLoanSchedule,
  overrideLoanApplicationRisk,
  pauseInterest,
  postLoanRepayment,
  recalcLoanDelinquency,
  runLoanApplicationFraudCheck,
  runLoanApplicationRiskEvaluation,
  resolveLoanApplicationHold,
  reverseDisbursement,
  removeInterestOverride,
  resumeInterest,
  setInterestOverride,
  settleLoan,
  transitionLoanApplication,
  writeOffLoan
} from '@/src/lib/api';
import { roleCanTransitionLoan } from '@/src/lib/transition-rbac';
import { PageHeader } from '@/src/components/layout/page-header';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { Select } from '@/src/ui/Select';
import { statusToBadgeVariant, statusToLabel } from '@/src/ui/status-badge';

type PageProps = {
  params: { id: string };
};

type TransitionAction = {
  label: string;
  toStatus: AdminLoanApplicationStatus;
  variant?: 'primary' | 'danger' | 'secondary' | 'ghost';
};

const ACTIONS_BY_STATUS: Record<AdminLoanApplicationStatus, TransitionAction[]> = {
  DRAFT: [],
  SUBMITTED: [{ label: 'Start Review', toStatus: 'UNDER_REVIEW' }],
  UNDER_REVIEW: [
    { label: 'Request Documents', toStatus: 'REQUESTED_DOCUMENTS', variant: 'secondary' },
    { label: 'Approve', toStatus: 'APPROVED' },
    { label: 'Reject', toStatus: 'REJECTED', variant: 'danger' }
  ],
  REQUESTED_DOCUMENTS: [{ label: 'Resume Review', toStatus: 'UNDER_REVIEW' }],
  APPROVED: [],
  READY_FOR_DISBURSEMENT: [],
  DISBURSED: [
    { label: 'Mark Repaid', toStatus: 'REPAID' },
    { label: 'Mark Defaulted', toStatus: 'DEFAULTED', variant: 'danger' }
  ],
  OVERDUE: [
    { label: 'Mark Repaid', toStatus: 'REPAID' },
    { label: 'Mark Defaulted', toStatus: 'DEFAULTED', variant: 'danger' }
  ],
  WRITTEN_OFF: [{ label: 'Settle', toStatus: 'SETTLED' }],
  SETTLED: [],
  REPAID: [],
  DEFAULTED: [],
  REJECTED: []
};

function metadataPreview(value: unknown): Array<{ key: string; value: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>)
    .slice(0, 4)
    .map(([key, entryValue]) => ({
      key,
      value:
        typeof entryValue === 'string'
          ? entryValue
          : typeof entryValue === 'number' || typeof entryValue === 'boolean'
            ? String(entryValue)
            : Array.isArray(entryValue)
              ? `Array(${entryValue.length})`
              : entryValue && typeof entryValue === 'object'
                ? 'Object'
                : 'null'
    }));
}

export default function LoanApplicationDetailPage({ params }: PageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, role, hydrated } = useAuth();
  const { tenantId, hydrated: tenantHydrated } = useTenant();

  const [disburseMethod, setDisburseMethod] = useState<'BANK_TRANSFER' | 'WALLET' | 'CASH'>('BANK_TRANSFER');
  const [disburseReference, setDisburseReference] = useState('');

  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState<'BANK_TRANSFER' | 'CARD' | 'WALLET' | 'CASH'>('BANK_TRANSFER');
  const [repayReference, setRepayReference] = useState('');

  const [scheduleInterestMethod, setScheduleInterestMethod] = useState<'REDUCING_BALANCE' | 'FLAT'>(
    'REDUCING_BALANCE'
  );
  const [accrualDate, setAccrualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [overrideRate, setOverrideRate] = useState('');
  const [riskHoldType, setRiskHoldType] = useState<
    'FRAUD_SUSPECTED' | 'KYC_MISSING' | 'DOCUMENTS_MISSING' | 'POLICY_VIOLATION' | 'MANUAL_REVIEW' | 'COLLECTIONS_REVIEW' | 'SYSTEM_VELOCITY'
  >('MANUAL_REVIEW');
  const [riskHoldNote, setRiskHoldNote] = useState('');
  const [transitionError, setTransitionError] = useState('');

  const readyMutation = useMutation({
    mutationFn: async () => markReadyForDisbursement(params.id),
    onSuccess: async () => {
      toast.success('Loan marked ready for disbursement');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to mark ready')
  });

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
      return;
    }
    if (tenantHydrated && !tenantId) {
      router.replace('/select-tenant');
    }
  }, [hydrated, router, tenantHydrated, tenantId, token]);

  const detailQuery = useQuery({
    queryKey: ['admin', 'loan', params.id],
    queryFn: () => getLoanApplication(params.id),
    enabled: Boolean(token && tenantId)
  });

  const scheduleQuery = useQuery({
    queryKey: ['admin', 'schedule', params.id],
    queryFn: () => listLoanSchedule(params.id),
    enabled: Boolean(token && tenantId)
  });

  const repaymentsQuery = useQuery({
    queryKey: ['admin', 'repayments', params.id],
    queryFn: () => listLoanRepayments(params.id),
    enabled: Boolean(token && tenantId)
  });

  const interestAuditQuery = useQuery({
    queryKey: ['admin', 'interest-audit', params.id],
    queryFn: () => listInterestAudit(params.id),
    enabled: Boolean(
      token && tenantId && (role === 'RISK_MANAGER' || role === 'OPS' || role === 'SUPER_ADMIN')
    )
  });
  const auditTrailQuery = useQuery({
    queryKey: ['admin', 'audit-trail', params.id],
    queryFn: () =>
      listAuditTrail({
        entityType: 'LoanApplication',
        entityId: params.id,
        limit: 20
      }),
    enabled: Boolean(token && tenantId)
  });

  const riskQuery = useQuery({
    queryKey: ['admin', 'loan-app', params.id, 'risk', tenantId],
    queryFn: () => getLoanApplicationRisk(params.id),
    enabled: Boolean(token && tenantId)
  });

  const riskEvaluationsQuery = useQuery({
    queryKey: ['admin', 'loan-app', params.id, 'risk-evals', tenantId],
    queryFn: () => listLoanApplicationRiskEvaluations(params.id),
    enabled: Boolean(token && tenantId)
  });

  const refreshLoan = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'loan', params.id] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'schedule', params.id] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'repayments', params.id] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'interest-audit', params.id] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'audit-trail', params.id] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'loan-app', params.id, 'risk', tenantId] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'loan-app', params.id, 'risk-evals', tenantId] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'loan-apps', tenantId] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'disbursements', tenantId] });
  };

  const transitionMutation = useMutation({
    mutationFn: async (toStatus: AdminLoanApplicationStatus) => {
      setTransitionError('');
      const note = window.prompt('Optional note for this transition:') ?? undefined;
      return transitionLoanApplication(params.id, { toStatus, note: note?.trim() || undefined });
    },
    onSuccess: async () => {
      toast.success('Status updated');
      await refreshLoan();
    },
    onError: (error) => {
      setTransitionError(error instanceof Error ? error.message : 'Transition failed');
      toast.error(error instanceof Error ? error.message : 'Transition failed');
    }
  });

  const disburseMutation = useMutation({
    mutationFn: async () =>
      disburseLoanApplication(params.id, {
        method: disburseMethod,
        idempotencyKey: crypto.randomUUID(),
        note: disburseReference.trim() || undefined
      }),
    onSuccess: async () => {
      toast.success('Loan disbursed');
      setDisburseReference('');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Disbursement failed')
  });

  const reverseDisbursementMutation = useMutation({
    mutationFn: async () => {
      const reason = window.prompt('Reason for reversal');
      if (!reason || !reason.trim()) {
        throw new Error('Reason is required');
      }
      return reverseDisbursement(String(detailQuery.data?.disbursement?.id), { reason: reason.trim() });
    },
    onSuccess: async () => {
      toast.success('Disbursement reversed');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Reversal failed')
  });

  const repayMutation = useMutation({
    mutationFn: async () =>
      postLoanRepayment(params.id, {
        amount: Number(repayAmount),
        channel: repayMethod === 'WALLET' ? 'BANK_TRANSFER' : repayMethod,
        reference: repayReference.trim() || undefined,
        postedAt: new Date().toISOString()
      }),
    onSuccess: async () => {
      toast.success('Repayment recorded');
      setRepayReference('');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Repayment failed')
  });

  const scheduleMutation = useMutation({
    mutationFn: async () =>
      generateLoanSchedule(params.id, {
        interestMethod: scheduleInterestMethod
      }),
    onSuccess: async () => {
      toast.success('Schedule generated');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Schedule generation failed')
  });

  const accrueMutation = useMutation({
    mutationFn: async () =>
      accrueInterest(params.id, {
        throughDate: accrualDate
      }),
    onSuccess: async () => {
      toast.success('Interest accrued');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Accrual failed')
  });

  const pauseInterestMutation = useMutation({
    mutationFn: async () => {
      const reason = window.prompt('Reason for pausing interest (optional)') ?? undefined;
      return pauseInterest(params.id, { reason: reason?.trim() || undefined });
    },
    onSuccess: async () => {
      toast.success('Interest accrual paused');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Pause failed')
  });

  const resumeInterestMutation = useMutation({
    mutationFn: async () => resumeInterest(params.id),
    onSuccess: async () => {
      toast.success('Interest accrual resumed');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Resume failed')
  });

  const setOverrideMutation = useMutation({
    mutationFn: async () => {
      const reason = window.prompt('Reason for override (optional)') ?? undefined;
      return setInterestOverride(params.id, {
        rate: Number(overrideRate),
        reason: reason?.trim() || undefined
      });
    },
    onSuccess: async () => {
      toast.success('Interest override set');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Set override failed')
  });

  const clearOverrideMutation = useMutation({
    mutationFn: async () => {
      const reason = window.prompt('Reason for removing override (optional)') ?? undefined;
      return removeInterestOverride(params.id, { reason: reason?.trim() || undefined });
    },
    onSuccess: async () => {
      toast.success('Interest override removed');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Remove override failed')
  });

  const recalcDelinquencyMutation = useMutation({
    mutationFn: async () => recalcLoanDelinquency(params.id),
    onSuccess: async () => {
      toast.success('Delinquency recalculated');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Recalculation failed')
  });

  const addActivityMutation = useMutation({
    mutationFn: async (note: string) => addCollectionActivity(params.id, { actionType: 'NOTE', note }),
    onSuccess: async () => {
      toast.success('Collection note added');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to add note')
  });

  const writeOffMutation = useMutation({
    mutationFn: async () => writeOffLoan(params.id),
    onSuccess: async () => {
      toast.success('Loan written off');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Write-off failed')
  });

  const settleMutation = useMutation({
    mutationFn: async () => settleLoan(params.id),
    onSuccess: async () => {
      toast.success('Loan settled');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Settle failed')
  });
  const createCaseMutation = useMutation({
    mutationFn: async () => {
      const subject = window.prompt('Case subject');
      if (!subject || !subject.trim()) throw new Error('Case subject is required');
      const description = window.prompt('Case description') ?? subject;
      return createCase({
        loanApplicationId: params.id,
        type: 'COMPLAINT',
        priority: 'MEDIUM',
        subject: subject.trim(),
        description: description.trim()
      });
    },
    onSuccess: async () => {
      toast.success('Case created');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'cases'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Case creation failed')
  });

  const addRiskHoldMutation = useMutation({
    mutationFn: async () =>
      addLoanApplicationHold(params.id, {
        type: riskHoldType,
        note: riskHoldNote.trim() || undefined
      }),
    onSuccess: async () => {
      toast.success('Risk hold added');
      setRiskHoldNote('');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to add hold')
  });

  const resolveRiskHoldMutation = useMutation({
    mutationFn: async (holdId: string) => {
      const resolutionNote = window.prompt('Resolution note (optional)') ?? undefined;
      return resolveLoanApplicationHold(holdId, { resolutionNote: resolutionNote?.trim() || undefined });
    },
    onSuccess: async () => {
      toast.success('Risk hold resolved');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to resolve hold')
  });

  const overrideRiskMutation = useMutation({
    mutationFn: async () => {
      const note = window.prompt('Override note (required)');
      if (!note || !note.trim()) {
        throw new Error('Override note is required');
      }
      return overrideLoanApplicationRisk(params.id, { note: note.trim() });
    },
    onSuccess: async () => {
      toast.success('Risk overridden to APPROVE');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Risk override failed')
  });

  const runRiskEvaluationMutation = useMutation({
    mutationFn: async () => runLoanApplicationRiskEvaluation(params.id),
    onSuccess: async () => {
      toast.success('Risk evaluation completed');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Risk evaluation failed')
  });

  const runFraudCheckMutation = useMutation({
    mutationFn: async () => runLoanApplicationFraudCheck(params.id),
    onSuccess: async (result) => {
      toast.success(result.blocked ? 'Fraud check blocked application' : 'Fraud check completed');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Fraud check failed')
  });
  const manualFraudFlagMutation = useMutation({
    mutationFn: async () => {
      const note = window.prompt('Manual fraud flag note (optional)') ?? undefined;
      return createManualFraudFlag(params.id, {
        severity: 'HIGH',
        note: note?.trim() || undefined
      });
    },
    onSuccess: async () => {
      toast.success('Manual fraud flag created');
      await refreshLoan();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'fraud', 'alerts', tenantId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create manual flag')
  });

  const decideMutation = useMutation({
    mutationFn: async () => decideLoanApplication(params.id),
    onSuccess: async (result) => {
      toast.success(`Decision: ${result.decision} -> ${result.transitionedTo}`);
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Decision failed')
  });

  const approveIdentityMutation = useMutation({
    mutationFn: async () => approveLoanIdentityManualReview(params.id),
    onSuccess: async () => {
      toast.success('Identity verification approved');
      await refreshLoan();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Identity approval failed')
  });

  const currentStatus = (detailQuery.data?.status ?? 'DRAFT') as AdminLoanApplicationStatus;
  const configuredActions = ACTIONS_BY_STATUS[currentStatus] ?? [];
  const permittedActions = configuredActions.filter((action) =>
    roleCanTransitionLoan(role, currentStatus, action.toStatus)
  );

  const canDisburse = useMemo(() => {
    return Boolean(
      detailQuery.data &&
        detailQuery.data.status === 'READY_FOR_DISBURSEMENT' &&
        (role === 'OPS' || role === 'SUPER_ADMIN')
    );
  }, [detailQuery.data, role]);

  const canMarkReadyForDisbursement = useMemo(() => {
    return Boolean(
      detailQuery.data &&
        detailQuery.data.status === 'APPROVED' &&
        (role === 'CREDIT_OFFICER' || role === 'SUPER_ADMIN')
    );
  }, [detailQuery.data, role]);

  const canRepay = useMemo(() => {
    return Boolean(
      detailQuery.data &&
        (detailQuery.data.status === 'DISBURSED' || detailQuery.data.status === 'OVERDUE') &&
        (role === 'COLLECTIONS' || role === 'OPS' || role === 'SUPER_ADMIN')
    );
  }, [detailQuery.data, role]);

  const canGenerateSchedule = useMemo(() => {
    return Boolean(
      detailQuery.data &&
        detailQuery.data.status === 'DISBURSED' &&
        (scheduleQuery.data?.length ?? 0) === 0
    );
  }, [detailQuery.data, scheduleQuery.data]);

  const canRecalcDelinquency = role === 'SUPER_ADMIN' || role === 'OPS' || role === 'COLLECTIONS';
  const canControlInterest = role === 'RISK_MANAGER' || role === 'OPS' || role === 'SUPER_ADMIN';
  const canRiskOverride = role === 'RISK_MANAGER' || role === 'SUPER_ADMIN';
  const canRunDecision =
    detailQuery.data?.status === 'SUBMITTED' &&
    (role === 'CREDIT_OFFICER' || role === 'SUPER_ADMIN' || role === 'RISK_MANAGER');
  const hasTransitionActions = canRunDecision || permittedActions.length > 0;
  const hasCriticalFraudSignal = (detailQuery.data?.fraudSignals ?? []).some(
    (signal) => signal.severity === 'CRITICAL'
  );

  if (!hydrated || !tenantHydrated || !token || !tenantId) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  const currentStatusLabel = statusToLabel(currentStatus);

  return (
    <div className="space-y-6">
      <PageHeader
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canRunDecision ? (
              <Button
                className="focus:ring-2 focus:ring-slate-300"
                disabled={decideMutation.isPending}
                onClick={() => decideMutation.mutate()}
                size="sm"
                variant="secondary"
              >
                {decideMutation.isPending ? 'Deciding...' : 'Run Decision'}
              </Button>
            ) : null}
            {permittedActions.map((action) => (
              <Button
                className="focus:ring-2 focus:ring-slate-300"
                key={action.label}
                disabled={transitionMutation.isPending}
                loading={transitionMutation.isPending}
                onClick={() => transitionMutation.mutate(action.toStatus)}
                size="sm"
                variant={action.variant ?? 'primary'}
              >
                {action.label}
              </Button>
            ))}
            <Button className="focus:ring-2 focus:ring-slate-300" onClick={() => createCaseMutation.mutate()} size="sm" variant="secondary">
              Create Case
            </Button>
            <Button
              className="focus:ring-2 focus:ring-slate-300"
              onClick={() => router.push(`/loan-applications/${params.id}/repayments`)}
              size="sm"
              variant="secondary"
            >
              View Repayments
            </Button>
            <Button className="focus:ring-2 focus:ring-slate-300" onClick={() => router.push(`/dashboard/loans/${params.id}/ledger`)} size="sm" variant="ghost">
              Loan Ledger
            </Button>
          </div>
        }
        subtitle={
          <span className="inline-flex items-center gap-2">
            Status:
            <Badge variant={statusToBadgeVariant(currentStatus)}>{currentStatusLabel}</Badge>
          </span>
        }
        title="Loan Application"
      />
      <div className="space-y-4">
        <div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-700">
            {params.id}
          </span>
        </div>
        {detailQuery.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <CardContent className="space-y-3 py-5">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-3 py-5">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-12 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-12 w-full animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          </div>
        ) : null}
        {detailQuery.isError ? (
          <Card className="rounded-xl border border-red-200 bg-red-50 shadow-sm">
            <CardContent className="space-y-3 py-4 text-sm text-red-700">
              {detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load application.'}
              <div>
                <Link className="text-sm font-medium underline focus:outline-none focus:ring-2 focus:ring-slate-300" href="/dashboard">
                  Back to applications
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {transitionError ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-center gap-2 py-3 text-sm text-destructive">
              <Badge variant="danger">Transition failed</Badge>
              <span>{transitionError}</span>
            </CardContent>
          </Card>
        ) : null}

        {detailQuery.data ? (
          <>
          {hasCriticalFraudSignal ? (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardContent className="py-3 text-sm text-destructive">
              Critical fraud signal detected. Approval/disbursement should be halted until reviewed.
              </CardContent>
            </Card>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <CardContent className="py-4">
                  <p className="mb-3 text-sm font-medium text-slate-900">Applicant</p>
                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <div>
                      <span className="font-medium">Name:</span>{' '}
                      {String(detailQuery.data.fullName ?? detailQuery.data.borrowerName ?? '-')}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {String(detailQuery.data.email ?? detailQuery.data.borrowerEmail ?? '-')}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {String(detailQuery.data.phone ?? detailQuery.data.borrowerPhone ?? '-')}
                    </div>
                    <div>
                      <span className="font-medium">Customer ID:</span> {String(detailQuery.data.borrowerId ?? '-')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <CardContent className="py-4">
                  <p className="mb-3 text-sm font-medium text-slate-900">Loan Summary</p>
                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <div>
                      <span className="font-medium">Requested:</span> {String(detailQuery.data.requestedAmount ?? '-')}
                    </div>
                    <div>
                      <span className="font-medium">Approved:</span> {String(detailQuery.data.approvedAmount ?? '-')}
                    </div>
                    <div>
                      <span className="font-medium">Disbursed:</span> {String(detailQuery.data.disbursedAmount ?? '-')}
                    </div>
                    <div>
                      <span className="font-medium">Outstanding:</span> {String(detailQuery.data.totalOutstanding ?? '-')}
                    </div>
                    <div>
                      <span className="font-medium">Product:</span> {String(detailQuery.data.productName ?? detailQuery.data.loanProductName ?? '-')}
                    </div>
                    <div>
                      <span className="font-medium">Tenor:</span> {String(detailQuery.data.tenorDays ?? detailQuery.data.tenor ?? '-')}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {detailQuery.data.createdAt ? new Date(String(detailQuery.data.createdAt)).toLocaleString() : '-'}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {statusToLabel(String(detailQuery.data.status))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {hasTransitionActions ? (
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <CardContent className="py-4">
                    <p className="mb-3 text-sm font-medium text-slate-900">Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {canRunDecision ? (
                        <Button
                          className="focus:ring-2 focus:ring-slate-300"
                          disabled={decideMutation.isPending}
                          onClick={() => decideMutation.mutate()}
                          size="sm"
                          variant="secondary"
                        >
                          {decideMutation.isPending ? 'Deciding...' : 'Run Decision'}
                        </Button>
                      ) : null}
                      {permittedActions.map((action) => (
                        <Button
                          className="focus:ring-2 focus:ring-slate-300"
                          key={action.label}
                          disabled={transitionMutation.isPending}
                          loading={transitionMutation.isPending}
                          onClick={() => transitionMutation.mutate(action.toStatus)}
                          size="sm"
                          variant={action.variant ?? 'primary'}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <CardContent className="py-4">
                <p className="mb-3 text-sm font-medium text-slate-900">Status Timeline</p>
                {(detailQuery.data.histories ?? []).length > 0 ? (
                  <div className="space-y-4 border-l border-slate-200 pl-4">
                    {(detailQuery.data.histories ?? []).map((item) => (
                      <div className="relative text-sm" key={item.id}>
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-400" />
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusToBadgeVariant(item.toStatus)}>{statusToLabel(item.toStatus)}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {item.changedAt ? new Date(item.changedAt).toLocaleString() : '-'}
                        </p>
                        {(item as Record<string, unknown>).actorRole ? (
                          <p className="text-xs text-slate-500">Role: {String((item as Record<string, unknown>).actorRole)}</p>
                        ) : null}
                        {item.note ? <p className="mt-1 text-xs text-slate-600">{item.note}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No status events yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Balances</p>
            <div className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
              <div>Outstanding Principal: {detailQuery.data.outstandingPrincipal ?? '0'}</div>
              <div>Outstanding Interest: {detailQuery.data.outstandingInterest ?? '0'}</div>
              <div>Outstanding Fees: {detailQuery.data.outstandingFees ?? '0'}</div>
              <div>Disbursed Amount: {detailQuery.data.disbursedAmount ?? '0'}</div>
              <div>Total Outstanding: {detailQuery.data.totalOutstanding ?? '0'}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Interest Status</p>
            <div className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
              <div>
                Accrual: {detailQuery.data.interestAccrualPaused ? 'Paused' : 'Active'}
              </div>
              <div>Base Rate: {detailQuery.data.annualInterestRate ?? '-'}</div>
              <div>Override Rate: {detailQuery.data.interestOverrideRate ?? '-'}</div>
              <div>
                Last Accrued:{' '}
                {detailQuery.data.lastAccruedAt ? new Date(detailQuery.data.lastAccruedAt).toLocaleString() : '-'}
              </div>
            </div>
            {canControlInterest ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {!detailQuery.data.interestAccrualPaused ? (
                  <Button
                    disabled={pauseInterestMutation.isPending}
                    onClick={() => pauseInterestMutation.mutate()}
                    size="sm"
                    variant="outline"
                  >
                    {pauseInterestMutation.isPending ? 'Pausing...' : 'Pause Interest'}
                  </Button>
                ) : (
                  <Button
                    disabled={resumeInterestMutation.isPending}
                    onClick={() => resumeInterestMutation.mutate()}
                    size="sm"
                    variant="outline"
                  >
                    {resumeInterestMutation.isPending ? 'Resuming...' : 'Resume Interest'}
                  </Button>
                )}
                <div className="w-44">
                  <Input
                    className="text-sm"
                    onChange={(event) => setOverrideRate(event.target.value)}
                    placeholder="Override rate"
                    value={overrideRate}
                  />
                </div>
                <Button
                  disabled={setOverrideMutation.isPending || !Number(overrideRate)}
                  onClick={() => setOverrideMutation.mutate()}
                  size="sm"
                  variant="outline"
                >
                  {setOverrideMutation.isPending ? 'Saving...' : 'Set Override Rate'}
                </Button>
                <Button
                  disabled={clearOverrideMutation.isPending || !detailQuery.data.interestOverrideRate}
                  onClick={() => clearOverrideMutation.mutate()}
                  size="sm"
                  variant="ghost"
                >
                  {clearOverrideMutation.isPending ? 'Removing...' : 'Remove Override'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Delinquency</p>
              {canRecalcDelinquency ? (
                <Button
                  disabled={recalcDelinquencyMutation.isPending}
                  onClick={() => recalcDelinquencyMutation.mutate()}
                  size="sm"
                  variant="outline"
                >
                  {recalcDelinquencyMutation.isPending ? 'Recalculating...' : 'Recalculate delinquency'}
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
              <div>Status: {detailQuery.data.delinquencyStatus ?? 'CURRENT'}</div>
              <div>Days Past Due: {detailQuery.data.daysPastDue ?? 0}</div>
              <div>Overdue Amount (cents): {detailQuery.data.overdueAmountCents ?? '0'}</div>
              <div>
                Last Recalc:{' '}
                {detailQuery.data.lastDelinquencyCalcAt
                  ? new Date(detailQuery.data.lastDelinquencyCalcAt).toLocaleString()
                  : '-'}
              </div>
            </div>
            {canRecalcDelinquency ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const note = window.prompt('Collection note');
                    if (note && note.trim()) addActivityMutation.mutate(note.trim());
                  }}
                  size="sm"
                  variant="outline"
                >
                  Add Note
                </Button>
                <Button disabled={writeOffMutation.isPending} onClick={() => writeOffMutation.mutate()} size="sm" variant="destructive">
                  Write Off
                </Button>
                <Button disabled={settleMutation.isPending} onClick={() => settleMutation.mutate()} size="sm" variant="outline">
                  Settle
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Risk</p>
            {riskQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading risk...</p> : null}
            {riskQuery.data ? (
              <div className="space-y-2 text-sm">
                <div>
                  Decision: <span className="font-medium">{riskQuery.data.assessment.decision}</span> | Score:{' '}
                  <span className="font-medium">{riskQuery.data.assessment.score}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last evaluated:{' '}
                  {riskQuery.data.assessment.createdAt
                    ? new Date(riskQuery.data.assessment.createdAt).toLocaleString()
                    : 'Never'}
                </div>
                <div className="space-y-1">
                  {(riskQuery.data.assessment.reasons ?? []).map((reason) => (
                    <div className="text-xs" key={reason.code}>
                      {reason.code}: {reason.message}
                    </div>
                  ))}
                  {(riskQuery.data.assessment.reasons ?? []).length === 0 ? (
                    <div className="text-xs text-muted-foreground">No risk reasons.</div>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Active Holds</p>
                  {(riskQuery.data.activeHolds ?? []).map((hold) => (
                    <div className="flex items-center justify-between rounded border p-2 text-xs" key={hold.id}>
                      <div>
                        <div className="font-medium">{hold.type}</div>
                        <div>{hold.note ?? '-'}</div>
                      </div>
                      <Button
                        disabled={resolveRiskHoldMutation.isPending}
                        onClick={() => resolveRiskHoldMutation.mutate(hold.id)}
                        size="sm"
                        variant="outline"
                      >
                        Resolve
                      </Button>
                    </div>
                  ))}
                  {(riskQuery.data.activeHolds ?? []).length === 0 ? (
                    <div className="text-xs text-muted-foreground">No active holds.</div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    className="h-9 w-52"
                    onChange={(event) =>
                      setRiskHoldType(
                        event.target.value as
                          | 'FRAUD_SUSPECTED'
                          | 'KYC_MISSING'
                          | 'DOCUMENTS_MISSING'
                          | 'POLICY_VIOLATION'
                          | 'MANUAL_REVIEW'
                          | 'COLLECTIONS_REVIEW'
                          | 'SYSTEM_VELOCITY'
                      )
                    }
                    value={riskHoldType}
                  >
                    <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
                    <option value="FRAUD_SUSPECTED">FRAUD_SUSPECTED</option>
                    <option value="KYC_MISSING">KYC_MISSING</option>
                    <option value="DOCUMENTS_MISSING">DOCUMENTS_MISSING</option>
                    <option value="POLICY_VIOLATION">POLICY_VIOLATION</option>
                    <option value="COLLECTIONS_REVIEW">COLLECTIONS_REVIEW</option>
                    <option value="SYSTEM_VELOCITY">SYSTEM_VELOCITY</option>
                  </Select>
                  <div className="w-56">
                    <Input
                      className="text-sm"
                      onChange={(event) => setRiskHoldNote(event.target.value)}
                      placeholder="Hold note (optional)"
                      value={riskHoldNote}
                    />
                  </div>
                  <Button
                    disabled={addRiskHoldMutation.isPending}
                    onClick={() => addRiskHoldMutation.mutate()}
                    size="sm"
                    variant="outline"
                  >
                    {addRiskHoldMutation.isPending ? 'Adding...' : 'Add Hold'}
                  </Button>
                  {canRiskOverride ? (
                    <Button
                      disabled={overrideRiskMutation.isPending}
                      onClick={() => overrideRiskMutation.mutate()}
                      size="sm"
                    >
                      {overrideRiskMutation.isPending ? 'Overriding...' : 'Override to APPROVE'}
                    </Button>
                  ) : null}
                  {(role === 'CREDIT_OFFICER' || role === 'RISK_MANAGER' || role === 'SUPER_ADMIN') ? (
                    <Button
                      disabled={runRiskEvaluationMutation.isPending}
                      onClick={() => runRiskEvaluationMutation.mutate()}
                      size="sm"
                      variant="outline"
                    >
                      {runRiskEvaluationMutation.isPending ? 'Running...' : 'Run Risk Evaluation'}
                    </Button>
                  ) : null}
                  {(role === 'CREDIT_OFFICER' || role === 'RISK_MANAGER' || role === 'SUPER_ADMIN') ? (
                    <Button
                      disabled={runFraudCheckMutation.isPending}
                      onClick={() => runFraudCheckMutation.mutate()}
                      size="sm"
                      variant="outline"
                    >
                      {runFraudCheckMutation.isPending ? 'Checking...' : 'Run Fraud Check'}
                    </Button>
                  ) : null}
                  {(role === 'COLLECTIONS' || role === 'OPS' || role === 'RISK_MANAGER' || role === 'SUPER_ADMIN') ? (
                    <Button
                      disabled={manualFraudFlagMutation.isPending}
                      onClick={() => manualFraudFlagMutation.mutate()}
                      size="sm"
                      variant="destructive"
                    >
                      {manualFraudFlagMutation.isPending ? 'Flagging...' : 'Manual Fraud Flag'}
                    </Button>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Evaluations</p>
                  {(riskEvaluationsQuery.data?.items ?? []).map((item) => (
                    <div className="rounded border p-2 text-xs" key={item.id}>
                      <div className="font-medium">
                        {item.decision} ({item.score}) - {item.trigger}
                      </div>
                      <div className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-muted/40 p-2">
                        {JSON.stringify(item.reasonsJson, null, 2)}
                      </pre>
                    </div>
                  ))}
                  {!riskEvaluationsQuery.isLoading && (riskEvaluationsQuery.data?.items?.length ?? 0) === 0 ? (
                    <div className="text-xs text-muted-foreground">No evaluations yet.</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Identity Verification</p>
            {detailQuery.data.identityVerification ? (
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{detailQuery.data.identityVerification.status}</Badge>
                  <span className="text-xs text-muted-foreground">Provider: {detailQuery.data.identityVerification.provider}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Match score:{' '}
                  {detailQuery.data.identityVerification.matchScore != null
                    ? `${Math.round(detailQuery.data.identityVerification.matchScore * 100)}%`
                    : 'N/A'}
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-[11px]">
                  {JSON.stringify(detailQuery.data.identityVerification.riskFlags ?? {}, null, 2)}
                </pre>
                <div className="text-xs text-muted-foreground">
                  {new Date(detailQuery.data.identityVerification.createdAt).toLocaleString()}
                </div>
                {detailQuery.data.identityVerification.status === 'MANUAL_REVIEW' && role === 'SUPER_ADMIN' ? (
                  <Button disabled={approveIdentityMutation.isPending} onClick={() => approveIdentityMutation.mutate()} size="sm">
                    {approveIdentityMutation.isPending ? 'Approving...' : 'Approve KYC'}
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No identity verification found.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Fraud Signals</p>
            {(detailQuery.data.fraudSignals ?? []).length > 0 ? (
              <div className="space-y-2 text-sm">
                {(detailQuery.data.fraudSignals ?? []).map((signal) => (
                  <div className="rounded border border-border p-2" key={signal.id}>
                    <div className="font-medium">
                      {signal.signalType} ({signal.severity})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(signal.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No fraud signals recorded.</p>
            )}
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Fraud Alerts</p>
              {(detailQuery.data.fraudAlerts ?? []).length > 0 ? (
                <div className="space-y-2 text-sm">
                  {(detailQuery.data.fraudAlerts ?? []).map((alert) => (
                    <div className="rounded border border-border p-2" key={alert.id}>
                      <div className="font-medium">
                        <Link className="underline" href={`/dashboard/fraud/alerts/${alert.id}`}>
                          {alert.id}
                        </Link>{' '}
                        ({alert.severity}) - {alert.status}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No fraud alerts.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Disbursement</p>
            {detailQuery.data.disbursement ? (
              <div className="text-sm">
                {detailQuery.data.disbursement.amount} {detailQuery.data.disbursement.currency} via{' '}
                {detailQuery.data.disbursement.method} ({detailQuery.data.disbursement.status}){' '}
                {detailQuery.data.disbursement.disbursedAt
                  ? `at ${new Date(detailQuery.data.disbursement.disbursedAt).toLocaleString()}`
                  : ''}
                {detailQuery.data.disbursement.providerReference
                  ? ` | ref ${detailQuery.data.disbursement.providerReference}`
                  : ''}
                {detailQuery.data.disbursement.failureReason
                  ? ` | failure ${detailQuery.data.disbursement.failureReason}`
                  : ''}
              </div>
            ) : null}
            {canDisburse ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  className="h-9 w-44"
                  onChange={(event) => setDisburseMethod(event.target.value as 'BANK_TRANSFER' | 'WALLET' | 'CASH')}
                  value={disburseMethod}
                >
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  <option value="WALLET">WALLET</option>
                  <option value="CASH">MANUAL</option>
                </Select>
                <div className="w-56">
                  <Input
                    className="text-sm"
                    onChange={(event) => setDisburseReference(event.target.value)}
                    placeholder="Reference (optional)"
                    value={disburseReference}
                  />
                </div>
                <Button
                  disabled={disburseMutation.isPending}
                  onClick={() => disburseMutation.mutate()}
                >
                  {disburseMutation.isPending ? 'Disbursing...' : 'Disburse'}
                </Button>
              </div>
            ) : null}
            {canMarkReadyForDisbursement ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  disabled={readyMutation.isPending}
                  onClick={() => readyMutation.mutate()}
                  variant="outline"
                >
                  {readyMutation.isPending ? 'Saving...' : 'Mark Ready For Disbursement'}
                </Button>
              </div>
            ) : null}
            {detailQuery.data.disbursement?.status === 'SUCCESS' && (role === 'OPS' || role === 'SUPER_ADMIN') ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  disabled={reverseDisbursementMutation.isPending}
                  onClick={() => reverseDisbursementMutation.mutate()}
                  size="sm"
                  variant="destructive"
                >
                  {reverseDisbursementMutation.isPending ? 'Reversing...' : 'Reverse Disbursement'}
                </Button>
              </div>
            ) : null}
            {detailQuery.data.status === 'DISBURSED' ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="w-44">
                  <Input
                    className="text-sm"
                    onChange={(event) => setAccrualDate(event.target.value)}
                    type="date"
                    value={accrualDate}
                  />
                </div>
                <Button
                  disabled={accrueMutation.isPending}
                  onClick={() => accrueMutation.mutate()}
                  variant="outline"
                >
                  {accrueMutation.isPending ? 'Accruing...' : 'Accrue Interest'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Schedule</p>
            {(scheduleQuery.data ?? []).length > 0 ? (
              <div className="space-y-2 text-sm">
                {(scheduleQuery.data ?? []).map((item) => (
                  <div className="rounded border p-2" key={item.id}>
                    #{item.installmentNumber} due {new Date(item.dueDate).toLocaleDateString()} | total {item.totalDue} |{' '}
                    {item.status} {item.status === 'OVERDUE' || item.isOverdue ? '(OVERDUE)' : ''}
                    {item.overdueSince ? ` | overdue since ${new Date(item.overdueSince).toLocaleDateString()}` : ''}
                    {item.remainingAmountCents ? ` | remaining(cents) ${item.remainingAmountCents}` : ''}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No schedule generated.</p>
            )}
            {canGenerateSchedule ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  className="h-9 w-52"
                  onChange={(event) => setScheduleInterestMethod(event.target.value as 'REDUCING_BALANCE' | 'FLAT')}
                  value={scheduleInterestMethod}
                >
                  <option value="REDUCING_BALANCE">REDUCING_BALANCE</option>
                  <option value="FLAT">FLAT</option>
                </Select>
                <Button
                  disabled={scheduleMutation.isPending}
                  onClick={() => scheduleMutation.mutate()}
                  variant="outline"
                >
                  {scheduleMutation.isPending ? 'Generating...' : 'Generate Schedule'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Repayments</p>
            {(repaymentsQuery.data ?? []).length > 0 ? (
              <div className="space-y-2 text-sm">
                {(repaymentsQuery.data ?? []).map((item) => (
                  <div className="rounded border p-2" key={item.id}>
                    {item.amount} {item.currency} via {item.channel} at {new Date(item.postedAt).toLocaleString()}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No repayments recorded.</p>
            )}
            {canRepay ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="w-36">
                  <Input
                    className="text-sm"
                    onChange={(event) => setRepayAmount(event.target.value)}
                    placeholder="Amount"
                    value={repayAmount}
                  />
                </div>
                <Select
                  className="h-9 w-44"
                  onChange={(event) =>
                    setRepayMethod(event.target.value as 'BANK_TRANSFER' | 'CARD' | 'WALLET' | 'CASH')
                  }
                  value={repayMethod}
                >
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  <option value="CARD">CARD</option>
                  <option value="WALLET">WALLET</option>
                  <option value="CASH">CASH</option>
                </Select>
                <div className="w-56">
                  <Input
                    className="text-sm"
                    onChange={(event) => setRepayReference(event.target.value)}
                    placeholder="Reference (optional)"
                    value={repayReference}
                  />
                </div>
                <Button
                  disabled={repayMutation.isPending || !Number(repayAmount)}
                  onClick={() => repayMutation.mutate()}
                  variant="outline"
                >
                  {repayMutation.isPending ? 'Saving...' : 'Record Repayment'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Decision history</p>
            <div className="space-y-2 text-sm">
              {(detailQuery.data.decisionEvents ?? []).map((item) => (
                <div className="rounded border border-border p-2" key={item.id}>
                  <div className="font-medium">
                    {item.decision} ({item.reasonCodes.join(', ') || 'NO_REASON'})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()} by {item.actorType}
                    {item.actorRole ? ` (${item.actorRole})` : ''}
                  </div>
                </div>
              ))}
              {(detailQuery.data.decisionEvents ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No decision events yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Recent Ledger Entries</p>
            <div className="space-y-2 text-sm">
              {(detailQuery.data.ledgerEntries ?? []).map((entry) => (
                <div className="rounded border border-border p-2" key={entry.id}>
                  <div className="font-medium">
                    {entry.type} at {new Date(entry.occurredAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">{entry.idempotencyKey}</div>
                  <div className="mt-1 space-y-1 text-xs">
                    {entry.lines.map((line) => (
                      <div key={line.id}>
                        {line.direction} {line.accountCode} {line.amount}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Collection Activity</p>
            <div className="space-y-2 text-sm">
              {(detailQuery.data.collectionActivities ?? []).map((item) => (
                <div className="rounded border border-border p-2" key={item.id}>
                  <div className="font-medium">{item.actionType}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()} by {item.performedBy}
                  </div>
                  {item.note ? <div className="text-xs">{item.note}</div> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Interest Control Audit</p>
            <div className="space-y-2 text-sm">
              {(interestAuditQuery.data ?? detailQuery.data.interestAccrualAudits ?? []).map((item) => (
                <div className="rounded border border-border p-2" key={item.id}>
                  <div className="font-medium">{item.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()} by {item.performedById}
                  </div>
                  <div className="text-xs">
                    {item.previousRate ?? '-'} {'->'} {item.newRate ?? '-'}
                  </div>
                  {item.reason ? <div className="text-xs">{item.reason}</div> : null}
                </div>
              ))}
              {!interestAuditQuery.isLoading &&
              (interestAuditQuery.data?.length ?? detailQuery.data.interestAccrualAudits?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">No interest control audit entries.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium">Audit Trail</p>
            <div className="space-y-2 text-sm">
              {(auditTrailQuery.data?.items ?? []).map((item) => (
                <div className="rounded border border-border p-2" key={item.id}>
                  {(() => {
                    const preview = metadataPreview(item.metadataJson);
                    return (
                      <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{item.action}</div>
                    <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.actorType}
                    {item.actorRole ? ` (${item.actorRole})` : ''}
                    {item.actorId ? ` · ${item.actorId}` : ''}
                  </div>
                  {preview.length > 0 ? (
                    <div className="mt-2 grid gap-1 sm:grid-cols-2">
                      {preview.map((entry) => (
                        <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1 text-[11px]" key={entry.key}>
                          <span className="font-medium text-slate-600">{entry.key}: </span>
                          <span className="text-slate-800">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Expand raw JSON</summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-[11px]">
                      {JSON.stringify(item.metadataJson ?? {}, null, 2)}
                    </pre>
                  </details>
                      </>
                    );
                  })()}
                </div>
              ))}
              {!auditTrailQuery.isLoading && (auditTrailQuery.data?.items?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">No audit events yet.</p>
              ) : null}
            </div>
          </div>
          </>
        ) : null}
      </div>
    </div>
  );
}








