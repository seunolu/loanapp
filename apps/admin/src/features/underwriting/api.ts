import { proxyRequest } from '@/lib/api/web-client';

export type UnderwritingCaseStatus = 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';
export type UnderwritingChecklistStatus = 'PENDING' | 'PASSED' | 'FAILED';

export type UnderwritingCaseListItem = {
  applicationId: string;
  borrowerId: string;
  status: UnderwritingCaseStatus;
  createdAt: string;
};

export type UnderwritingCaseListResponse = {
  items: UnderwritingCaseListItem[];
  nextCursor: string | null;
};

export type UnderwritingChecklistItem = {
  id: string;
  code: string;
  label: string;
  status: UnderwritingChecklistStatus;
  isRequired: boolean;
  notes: string | null;
};

export type UnderwritingCaseDetail = {
  applicationId: string;
  borrowerId: string;
  status: UnderwritingCaseStatus;
  monthlyIncomeKobo: number | null;
  existingDebtKobo: number | null;
  riskLevel: string | null;
  decisionNotes: string | null;
  decidedByAdminId: string | null;
  completedAt: string | null;
  checklist: UnderwritingChecklistItem[];
};

export async function fetchUnderwritingCases(params: {
  limit: number;
  cursor?: string;
  status?: UnderwritingCaseStatus;
  query?: string;
}): Promise<UnderwritingCaseListResponse> {
  const search = new URLSearchParams({ limit: String(params.limit) });
  if (params.cursor) {
    search.set('cursor', params.cursor);
  }
  if (params.status) {
    search.set('status', params.status);
  }
  if (params.query) {
    search.set('query', params.query);
  }
  return (await proxyRequest(`admin/underwriting/cases?${search.toString()}`)) as UnderwritingCaseListResponse;
}

export async function fetchUnderwritingCase(applicationId: string): Promise<UnderwritingCaseDetail> {
  return (await proxyRequest(`admin/underwriting/cases/${applicationId}`)) as UnderwritingCaseDetail;
}

export async function updateUnderwritingCase(
  applicationId: string,
  input: {
    status?: UnderwritingCaseStatus;
    monthlyIncomeKobo?: number | null;
    existingDebtKobo?: number | null;
    riskLevel?: string | null;
    decisionNotes?: string | null;
  }
): Promise<UnderwritingCaseDetail> {
  return (await proxyRequest(`admin/underwriting/cases/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  })) as UnderwritingCaseDetail;
}

export async function upsertUnderwritingChecklist(
  applicationId: string,
  items: Array<{
    code: string;
    label: string;
    status: UnderwritingChecklistStatus;
    isRequired: boolean;
    notes?: string | null;
  }>
): Promise<UnderwritingCaseDetail> {
  return (await proxyRequest(`admin/underwriting/cases/${applicationId}/checklist`, {
    method: 'POST',
    body: JSON.stringify({ items })
  })) as UnderwritingCaseDetail;
}
