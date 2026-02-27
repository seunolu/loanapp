import type { BadgeTone } from '../../ui/components';
import type { BorrowerLoanApplicationDetail, BorrowerLoanOfferDetail } from '../../lib/api';

export type LoanHistoryStatus = 'ACTIVE' | 'APPROVED' | 'PAID' | 'REPAID' | 'DECLINED' | 'REJECTED' | 'PENDING' | string;

export type LoanHistoryItem = {
  id: string;
  amountKobo: number;
  status: LoanHistoryStatus;
  statusLabel: string;
  statusTone: BadgeTone;
  createdAt: string;
  dueDate?: string;
  reference?: string;
  tenorDays?: number;
  currency: 'NGN';
};

export type FetchLoanHistoryParams = {
  limit?: number;
};

export type LoanDetailRecord = {
  application: BorrowerLoanApplicationDetail;
  offer: BorrowerLoanOfferDetail | null;
};

export type LoanDetailViewModel = {
  id: string;
  amountKobo: number;
  status: string;
  statusLabel: string;
  statusTone: BadgeTone;
  createdAt: string;
  submittedAt: string;
  principalKobo: number;
  interestKobo: number;
  feeKobo: number;
  totalPayableKobo: number;
  tenorDays: number;
  dueDate?: string;
  reference?: string;
  timeline: { label: string; date: string }[];
};
