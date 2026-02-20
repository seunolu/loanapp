import { z } from 'zod';

export const createLoanProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  currency: z.string().trim().min(3).max(3).default('NGN'),
  minPrincipal: z.coerce.number().int().nonnegative(),
  maxPrincipal: z.coerce.number().int().positive(),
  minTenorDays: z.coerce.number().int().positive(),
  maxTenorDays: z.coerce.number().int().positive(),
  interestType: z.enum(['FLAT', 'REDUCING']),
  interestRateBps: z.coerce.number().int().nonnegative(),
  repaymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  graceDays: z.coerce.number().int().nonnegative().default(0),
  allowEarlyRepayment: z.boolean().default(true)
});

export type CreateLoanProductDto = z.infer<typeof createLoanProductSchema>;
