import type { BorrowerRecentLoan } from '../../lib/api';
import type { LoanHistoryItem, LoanHistoryStatus } from './loanHistory.types';

function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapStatusTone(status: LoanHistoryStatus): LoanHistoryItem['statusTone'] {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'APPROVED' || normalized === 'PAID' || normalized === 'REPAID') {
    return 'success';
  }
  if (normalized === 'DECLINED' || normalized === 'REJECTED' || normalized === 'FAILED') {
    return 'danger';
  }
  if (normalized === 'PENDING' || normalized === 'UNDER_REVIEW' || normalized === 'SUBMITTED') {
    return 'warning';
  }
  return 'muted';
}

export function mapLoanHistory(raw: BorrowerRecentLoan[]): LoanHistoryItem[] {
  return raw.map((item) => ({
    id: item.id,
    amountKobo: item.amountKobo,
    status: item.status,
    statusLabel: formatStatusLabel(item.status),
    statusTone: mapStatusTone(item.status),
    createdAt: item.createdAt,
    currency: 'NGN'
  }));
}

