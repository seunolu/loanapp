import { proxyRequest } from '@/lib/api/web-client';
import { fetchUnderwritingCase, type UnderwritingCaseDetail } from '@/src/features/underwriting/api';

export type LoanApplicationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type LoanApplicationListItem = {
  id: string;
  borrowerId: string;
  amountRequested: number;
  tenorDays: number;
  status: LoanApplicationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
};

export type LoanApplicationListResponse = {
  items: LoanApplicationListItem[];
  nextCursor: string | null;
};

export type OfferPreview = {
  applicationId: string;
  principalAmount: number;
  interestAmount: number;
  feeAmount: number;
  totalRepayable: number;
  expiresAt: string;
  scheduleType: 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL';
  schedule: Array<{
    dueDate: string;
    amount: number;
  }>;
  pricingSnapshot: {
    interestRateBpsMonthly: number;
    originationFeeKoboFlat: number;
    originationFeeBps: number;
    scheduleType: 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL';
    offerExpiryHours: number;
  };
};

export type ApproveResponse = {
  applicationId: string;
  status: 'APPROVED';
  offerId: string;
  offerStatus: 'OFFERED';
};

export type RejectResponse = {
  applicationId: string;
  status: 'REJECTED';
  reviewReason: string;
};

export type ApplicationDetail = {
  application: LoanApplicationListItem;
  underwriting: UnderwritingCaseDetail | null;
};

export async function fetchApplications(params: {
  limit: number;
  cursor?: string;
  status?: LoanApplicationStatus;
  query?: string;
}): Promise<LoanApplicationListResponse> {
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
  return (await proxyRequest(`admin/loans/applications?${search.toString()}`)) as LoanApplicationListResponse;
}

export async function fetchApplicationDetail(applicationId: string): Promise<ApplicationDetail> {
  const list = (await fetchApplications({
    limit: 1,
    query: applicationId
  })) as LoanApplicationListResponse;
  const application = list.items.find((item) => item.id === applicationId);
  if (!application) {
    throw new Error('Application not found.');
  }

  const underwriting = await fetchUnderwritingCase(applicationId).catch(() => null);

  return { application, underwriting };
}

export async function previewOffer(applicationId: string): Promise<OfferPreview> {
  return (await proxyRequest(`admin/loans/applications/${applicationId}/offer/preview`, {
    method: 'POST',
    body: JSON.stringify({})
  })) as OfferPreview;
}

export async function approveApplication(applicationId: string): Promise<ApproveResponse> {
  return (await proxyRequest(`admin/loans/applications/${applicationId}/approve`, {
    method: 'POST',
    body: JSON.stringify({})
  })) as ApproveResponse;
}

export async function rejectApplication(applicationId: string, reason: string): Promise<RejectResponse> {
  return (await proxyRequest(`admin/loans/applications/${applicationId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  })) as RejectResponse;
}
