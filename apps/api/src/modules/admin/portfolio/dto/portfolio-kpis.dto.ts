import { z } from 'zod';

export const portfolioKpisSchema = z.object({
  asOf: z.string().datetime(),
  activeLoansCount: z.number().int().nonnegative(),
  totalDisbursed: z.number().nonnegative(),
  totalPrincipalOutstanding: z.number().nonnegative(),
  totalInterestAccrued: z.number().nonnegative(),
  totalRepaid: z.number().nonnegative(),
  overdueAmount: z.number().nonnegative(),
  par30Amount: z.number().nonnegative(),
  par90Amount: z.number().nonnegative(),
  par30Rate: z.number().min(0).max(1),
  par90Rate: z.number().min(0).max(1),
  defaultRate: z.number().min(0).max(1),
  recoveryRate: z.number().min(0).max(1),
  avgDaysPastDue: z.number().nonnegative()
});

export type PortfolioKPIsDto = z.infer<typeof portfolioKpisSchema>;
