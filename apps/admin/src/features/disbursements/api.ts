import { proxyRequest } from '@/lib/api/web-client';

export type DisbursementStatus = 'PENDING' | 'INITIATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

export type DisbursementListItem = {
  id: string;
  loanId: string;
  borrowerId?: string | null;
  amountKobo: number;
  status: DisbursementStatus;
  createdAt?: string;
  initiatedAt?: string | null;
  succeededAt?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
};

export type DisbursementListResponse = {
  items: DisbursementListItem[];
  nextCursor: string | null;
};

export async function fetchDisbursements(params: {
  limit: number;
  cursor?: string;
  status?: DisbursementStatus;
}): Promise<DisbursementListResponse> {
  const search = new URLSearchParams({ limit: String(params.limit) });
  if (params.cursor) {
    search.set('cursor', params.cursor);
  }
  if (params.status) {
    search.set('status', params.status);
  }
  return (await proxyRequest(`admin/disbursements?${search.toString()}`)) as DisbursementListResponse;
}

export async function initiateDisbursement(disbursementId: string): Promise<unknown> {
  return proxyRequest(`admin/disbursements/${disbursementId}/initiate`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}
