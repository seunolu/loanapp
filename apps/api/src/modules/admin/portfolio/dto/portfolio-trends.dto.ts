import { z } from 'zod';

export const portfolioTrendsQuerySchema = z
  .object({
    days: z.coerce.number().int().min(7).max(365).default(30)
  })
  .strict();

const amountPointSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().nonnegative()
});

export const portfolioTrendsSchema = z.object({
  days: z.number().int().min(7).max(365),
  disbursements: z.array(amountPointSchema),
  repayments: z.array(amountPointSchema),
  applications: z.array(
    z.object({
      date: z.string().datetime(),
      submitted: z.number().int().nonnegative(),
      approved: z.number().int().nonnegative(),
      rejected: z.number().int().nonnegative()
    })
  ),
  delinquencyBuckets: z.object({
    current: z.number().int().nonnegative(),
    dpd1_30: z.number().int().nonnegative(),
    dpd31_60: z.number().int().nonnegative(),
    dpd61_90: z.number().int().nonnegative(),
    dpd90plus: z.number().int().nonnegative()
  })
});

export type PortfolioTrendsQueryDto = z.infer<typeof portfolioTrendsQuerySchema>;
export type PortfolioTrendsDto = z.infer<typeof portfolioTrendsSchema>;
