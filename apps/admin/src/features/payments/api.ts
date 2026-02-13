import { proxyRequest } from '@/lib/api/web-client';

export type PaymentLikeStatus = 'INITIATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REVERSED';

export type PaymentListItem = {
  id: string;
  loanId: string | null;
  amountKobo: number;
  status: PaymentLikeStatus;
  provider?: string | null;
  providerRef?: string | null;
  createdAt: string;
};

export type RepaymentListItem = {
  id: string;
  loanId: string;
  paymentId: string;
  totalAppliedKobo: number;
  createdAt: string;
};

export type CursorResponse<TItem> = {
  items: TItem[];
  nextCursor: string | null;
};

type ListParams = {
  limit: number;
  cursor?: string;
  status?: string;
  from?: string;
  to?: string;
};

function toSearch(params: ListParams): string {
  const search = new URLSearchParams({ limit: String(params.limit) });
  if (params.cursor) {
    search.set('cursor', params.cursor);
  }
  if (params.status) {
    search.set('status', params.status);
  }
  if (params.from) {
    search.set('from', params.from);
  }
  if (params.to) {
    search.set('to', params.to);
  }
  return search.toString();
}

export async function fetchPayments(params: ListParams): Promise<CursorResponse<PaymentListItem>> {
  return (await proxyRequest(`admin/payments?${toSearch(params)}`)) as CursorResponse<PaymentListItem>;
}

export async function fetchRepayments(params: ListParams): Promise<CursorResponse<RepaymentListItem>> {
  return (await proxyRequest(`admin/repayments?${toSearch(params)}`)) as CursorResponse<RepaymentListItem>;
}
