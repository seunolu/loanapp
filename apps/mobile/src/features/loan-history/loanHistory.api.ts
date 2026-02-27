import { listRecentLoans } from '../../lib/api';
import type { FetchLoanHistoryParams } from './loanHistory.types';

export async function fetchLoanHistory(params: FetchLoanHistoryParams = {}) {
  const limit = params.limit ?? 20;
  return listRecentLoans(limit);
}

