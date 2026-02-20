export type PortfolioSummaryDto = {
  asOf: string;
  activeLoanCount: number;
  totalOutstandingPrincipal: number;
  totalOutstandingInterest: number;
  totalOutstandingFees: number;
  totalOutstandingTotal: number;
  disbursedTodayAmount: number;
  disbursedThisWeekAmount: number;
  disbursedThisMonthAmount: number;
  repaymentsTodayAmount: number;
  repaymentsThisWeekAmount: number;
  repaymentsThisMonthAmount: number;
};

