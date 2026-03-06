import type { BadgeTone } from '../../ui';

export type TransactionFilter = 'ALL' | 'LOANS' | 'REPAYMENTS' | 'FEES';
export type TransactionKind = 'LOAN' | 'REPAYMENT' | 'FEE';
export type TransactionSource = 'REAL' | 'MOCK';

export type TransactionItem = {
  id: string;
  source: TransactionSource;
  kind: TransactionKind;
  kindLabel: string;
  title: string;
  amountKobo: number;
  status: string;
  statusLabel: string;
  statusTone: BadgeTone;
  reference: string;
  createdAt: string;
  narration: string;
};

export type TransactionDetail = TransactionItem & {
  metadata: { label: string; value: string }[];
};

export type TransactionListParams = {
  filter?: TransactionFilter;
  search?: string;
};
