import type { AdminLoanApplicationStatus } from '@/src/lib/api';

type StatusBadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function statusToBadgeVariant(status: AdminLoanApplicationStatus | string): StatusBadgeVariant {
  switch (status) {
    case 'APPROVED':
    case 'DISBURSED':
    case 'REPAID':
    case 'SETTLED':
      return 'success';
    case 'REQUESTED_DOCUMENTS':
    case 'UNDER_REVIEW':
    case 'READY_FOR_DISBURSEMENT':
      return 'info';
    case 'OVERDUE':
    case 'WRITTEN_OFF':
      return 'warning';
    case 'REJECTED':
    case 'DEFAULTED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function statusToLabel(status: AdminLoanApplicationStatus | string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
