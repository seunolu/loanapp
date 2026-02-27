import type { BadgeTone } from '../../ui/components';

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

