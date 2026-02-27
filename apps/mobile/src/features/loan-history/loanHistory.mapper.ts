import type { BorrowerRecentLoan } from '../../lib/api';
import type { LoanDetailRecord, LoanDetailViewModel, LoanHistoryItem, LoanHistoryStatus } from './loanHistory.types';

export function formatLoanStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function mapLoanStatusTone(status: LoanHistoryStatus): LoanHistoryItem['statusTone'] {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'APPROVED' || normalized === 'PAID' || normalized === 'REPAID' || normalized === 'DISBURSED') {
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
    statusLabel: formatLoanStatusLabel(item.status),
    statusTone: mapLoanStatusTone(item.status),
    createdAt: item.createdAt,
    currency: 'NGN'
  }));
}

export function mapLoanDetail(record: LoanDetailRecord): LoanDetailViewModel {
  const { application, offer } = record;
  const principalKobo = offer?.principalAmount ?? application.amountRequested;
  const interestKobo = offer?.interestAmount ?? 0;
  const feeKobo = offer?.feeAmount ?? 0;
  const totalPayableKobo = offer?.totalRepayable ?? principalKobo + interestKobo + feeKobo;
  const dueDate = offer?.schedule?.[0]?.dueDate;
  const timeline: LoanDetailViewModel['timeline'] = [
    { label: 'Created', date: application.createdAt },
    { label: 'Submitted', date: application.submittedAt }
  ];

  if (offer?.offeredAt) {
    timeline.push({ label: 'Approved', date: offer.offeredAt });
  }
  if (application.status.toUpperCase() === 'DISBURSED') {
    timeline.push({ label: 'Disbursed', date: application.updatedAt });
  }
  if (application.status.toUpperCase() === 'REPAID') {
    timeline.push({ label: 'Completed', date: application.updatedAt });
  }

  return {
    id: application.id,
    amountKobo: application.amountRequested,
    status: application.status,
    statusLabel: formatLoanStatusLabel(application.status),
    statusTone: mapLoanStatusTone(application.status),
    createdAt: application.createdAt,
    submittedAt: application.submittedAt,
    principalKobo,
    interestKobo,
    feeKobo,
    totalPayableKobo,
    tenorDays: application.tenorDays,
    dueDate,
    reference: offer?.offerId,
    timeline
  };
}
