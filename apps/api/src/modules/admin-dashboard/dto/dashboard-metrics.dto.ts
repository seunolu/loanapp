import { z } from 'zod';

export const dashboardMetricsResponseSchema = z.object({
  totals: z.object({
    totalLoanVolume: z.number().nonnegative(),
    activeLoans: z.number().int().nonnegative(),
    portfolioOutstanding: z.number().nonnegative(),
    par30: z.number().min(0).max(1),
    totalInterestEarned: z.number().nonnegative(),
    defaultRate: z.number().min(0).max(1)
  }),
  snapshots: z.object({
    asOf: z.string().datetime()
  })
});

export type DashboardMetricsDto = z.infer<typeof dashboardMetricsResponseSchema>;
