import { proxyRequest } from '@/lib/api/web-client';

export type SummaryReport = {
  asOf: string;
  totalBorrowers: number;
  activeLoans: number;
  overdueLoans: number;
  pendingDisbursementLoans: number;
  outstandingPrincipalKobo: number;
  outstandingTotalKobo: number;
  disbursedTotalKobo: number;
  collectedTotalKobo: number;
};

export type CollectionsReport = {
  from: string;
  to: string;
  totalCollectedKobo: number;
  paymentsCount: number;
  dailyBuckets: Array<{
    date: string;
    amountKobo: number;
    count: number;
  }>;
};

export type ParReport = {
  asOf: string;
  portfolioOutstandingKobo: number;
  par1AmountKobo: number;
  par1Rate: number;
  par7AmountKobo: number;
  par7Rate: number;
  par30AmountKobo: number;
  par30Rate: number;
};

export async function fetchSummary(): Promise<SummaryReport> {
  return (await proxyRequest('admin/reports/summary')) as SummaryReport;
}

export async function fetchCollectionsLast30Days(): Promise<CollectionsReport> {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  const query = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    daily: 'true'
  });
  return (await proxyRequest(`admin/reports/collections?${query.toString()}`)) as CollectionsReport;
}

export async function fetchParToday(): Promise<ParReport> {
  const query = new URLSearchParams({ asOf: new Date().toISOString() });
  return (await proxyRequest(`admin/reports/par?${query.toString()}`)) as ParReport;
}
