import type { AdminActorRole, AdminLoanApplicationStatus } from './api';

type Transition = {
  from: AdminLoanApplicationStatus;
  to: AdminLoanApplicationStatus;
};

const RULES: Record<
  Exclude<AdminActorRole, 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'OWNER' | 'FINANCE' | 'VIEWER' | 'PLATFORM_SUPER_ADMIN'>,
  Transition[]
> = {
  CREDIT_OFFICER: [
    { from: 'SUBMITTED', to: 'UNDER_REVIEW' },
    { from: 'UNDER_REVIEW', to: 'REQUESTED_DOCUMENTS' },
    { from: 'REQUESTED_DOCUMENTS', to: 'UNDER_REVIEW' },
    { from: 'APPROVED', to: 'READY_FOR_DISBURSEMENT' }
  ],
  RISK_MANAGER: [
    { from: 'UNDER_REVIEW', to: 'APPROVED' },
    { from: 'UNDER_REVIEW', to: 'REJECTED' }
  ],
  OPS: [
    { from: 'READY_FOR_DISBURSEMENT', to: 'DISBURSED' },
    { from: 'DISBURSED', to: 'REPAID' }
  ],
  COLLECTIONS: [
    { from: 'DISBURSED', to: 'DEFAULTED' },
    { from: 'DISBURSED', to: 'REPAID' },
    { from: 'OVERDUE', to: 'DEFAULTED' },
    { from: 'OVERDUE', to: 'REPAID' },
    { from: 'OVERDUE', to: 'WRITTEN_OFF' },
    { from: 'OVERDUE', to: 'SETTLED' },
    { from: 'WRITTEN_OFF', to: 'SETTLED' }
  ],
  SYSTEM: [
    { from: 'DISBURSED', to: 'OVERDUE' },
    { from: 'OVERDUE', to: 'DISBURSED' },
    { from: 'DISBURSED', to: 'REPAID' },
    { from: 'OVERDUE', to: 'REPAID' }
  ]
};

function normalizeRole(role: AdminActorRole | null): AdminActorRole | null {
  if (role === 'TENANT_ADMIN') {
    return 'CREDIT_OFFICER';
  }
  return role;
}

export function roleCanTransitionLoan(
  role: AdminActorRole | null,
  from: AdminLoanApplicationStatus,
  to: AdminLoanApplicationStatus
): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) {
    return false;
  }
  if (
    normalized === 'SUPER_ADMIN' ||
    normalized === 'OWNER' ||
    normalized === 'PLATFORM_SUPER_ADMIN'
  ) {
    return true;
  }

  const transitions = RULES[normalized as keyof typeof RULES] ?? [];
  return transitions.some((entry) => entry.from === from && entry.to === to);
}
