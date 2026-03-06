import { getLoanApplicationDetail, getLoanOfferByApplication, listRecentLoans } from '../../lib/api';
import { shouldUseMockApi } from '../../lib/mock';
import { getMockTransaction, listMockTransactions } from './transactions.mock';
import { mapLoanDetailToTransactionDetail, mapLoanToTransactionItem, matchesTransactionFilter, matchesTransactionSearch } from './transactions.mapper';
import type { TransactionDetail, TransactionItem, TransactionListParams } from './transactions.types';

function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export async function listTransactions(params: TransactionListParams = {}): Promise<TransactionItem[]> {
  const [loans, mockItems] = await Promise.all([
    listRecentLoans(20).catch(() => []),
    Promise.resolve(shouldUseMockApi() ? listMockTransactions() : [])
  ]);

  const combined = sortByCreatedAtDesc([
    ...loans.map(mapLoanToTransactionItem),
    ...mockItems
  ]);

  return combined.filter((item) => matchesTransactionFilter(item.kind, params.filter ?? 'ALL') && matchesTransactionSearch(item, params.search ?? ''));
}

export async function getTransactionDetail(id: string): Promise<TransactionDetail> {
  const mockTransaction = getMockTransaction(id);
  if (mockTransaction) {
    return mockTransaction;
  }

  const application = await getLoanApplicationDetail(id);
  const offer = await getLoanOfferByApplication(id).catch(() => null);
  return mapLoanDetailToTransactionDetail(application, offer);
}
