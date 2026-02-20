import { z } from 'zod';

export const updateLoanProductSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    currency: z.string().trim().min(3).max(3).optional(),
    minPrincipal: z.coerce.number().int().nonnegative().optional(),
    maxPrincipal: z.coerce.number().int().positive().optional(),
    minTenorDays: z.coerce.number().int().positive().optional(),
    maxTenorDays: z.coerce.number().int().positive().optional(),
    interestType: z.enum(['FLAT', 'REDUCING']).optional(),
    interestRateBps: z.coerce.number().int().nonnegative().optional(),
    repaymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
    graceDays: z.coerce.number().int().nonnegative().optional(),
    allowEarlyRepayment: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

export type UpdateLoanProductDto = z.infer<typeof updateLoanProductSchema>;
