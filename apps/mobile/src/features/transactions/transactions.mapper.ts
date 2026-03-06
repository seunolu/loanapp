import type { BorrowerLoanApplicationDetail, BorrowerLoanOfferDetail, BorrowerRecentLoan } from '../../lib/api';
import { formatStatusLabel } from '../../lib/format';
import type { TransactionDetail, TransactionFilter, TransactionItem, TransactionKind } from './transactions.types';

export function mapTransactionStatusTone(status: string): TransactionItem['statusTone'] {
  const normalized = status.toUpperCase();
  if (normalized === 'SUCCEEDED' || normalized === 'SUCCESS' || normalized === 'ACTIVE' || normalized === 'DISBURSED' || normalized === 'REPAID') {
    return 'success';
  }
  if (normalized === 'FAILED' || normalized === 'REJECTED' || normalized === 'CANCELLED' || normalized === 'CANCELED') {
    return 'danger';
  }
  if (normalized === 'PENDING' || normalized === 'PROCESSING' || normalized === 'UNDER_REVIEW' || normalized === 'SUBMITTED') {
    return 'warning';
  }
  return 'muted';
}

export function mapLoanToTransactionItem(loan: BorrowerRecentLoan): TransactionItem {
  return {
    id: loan.id,
    source: 'REAL',
    kind: 'LOAN',
    kindLabel: 'Loan',
    title: 'Loan activity',
    amountKobo: loan.amountKobo,
    status: loan.status,
    statusLabel: formatStatusLabel(loan.status),
    statusTone: mapTransactionStatusTone(loan.status),
    reference: loan.id,
    createdAt: loan.createdAt,
    narration: 'Loan application or disbursement activity.'
  };
}

export function mapLoanDetailToTransactionDetail(
  application: BorrowerLoanApplicationDetail,
  offer: BorrowerLoanOfferDetail | null
): TransactionDetail {
  const reference = offer?.offerId ?? application.id;
  return {
    id: application.id,
    source: 'REAL',
    kind: 'LOAN',
    kindLabel: 'Loan',
    title: 'Loan activity',
    amountKobo: application.amountRequested,
    status: application.status,
    statusLabel: formatStatusLabel(application.status),
    statusTone: mapTransactionStatusTone(application.status),
    reference,
    createdAt: application.createdAt,
    narration: offer ? 'Loan offer activity linked to this application.' : 'Loan application activity.',
    metadata: [
      { label: 'Type', value: 'Loan' },
      { label: 'Status', value: formatStatusLabel(application.status) },
      { label: 'Reference', value: reference },
      { label: 'Created', value: application.createdAt },
      { label: 'Submitted', value: application.submittedAt },
      { label: 'Tenor', value: `${application.tenorDays} days` },
      ...(offer?.schedule?.[0]?.dueDate ? [{ label: 'Due date', value: offer.schedule[0].dueDate }] : []),
      { label: 'Narration', value: offer ? 'Loan offer and repayment schedule prepared.' : 'Loan application created.' }
    ]
  };
}

export function matchesTransactionFilter(kind: TransactionKind, filter: TransactionFilter): boolean {
  if (filter === 'ALL') {
    return true;
  }
  if (filter === 'LOANS') {
    return kind === 'LOAN';
  }
  if (filter === 'REPAYMENTS') {
    return kind === 'REPAYMENT';
  }
  return kind === 'FEE';
}

export function matchesTransactionSearch(item: TransactionItem, search: string): boolean {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }
  return [item.title, item.reference, item.narration, item.statusLabel, item.kindLabel]
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearch);
}
