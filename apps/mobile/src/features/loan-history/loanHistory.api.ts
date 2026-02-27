import { getLoanApplicationDetail, getLoanOfferByApplication, listRecentLoans } from '../../lib/api';
import type { FetchLoanHistoryParams, LoanDetailRecord } from './loanHistory.types';

export async function fetchLoanHistory(params: FetchLoanHistoryParams = {}) {
  const limit = params.limit ?? 20;
  return listRecentLoans(limit);
}

export async function fetchLoanDetail(id: string): Promise<LoanDetailRecord> {
  const application = await getLoanApplicationDetail(id);
  const offer = await getLoanOfferByApplication(id).catch(() => null);
  return {
    application,
    offer
  };
}
