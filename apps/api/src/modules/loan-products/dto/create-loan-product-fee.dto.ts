import { z } from 'zod';

export const createLoanProductFeeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['FIXED', 'PERCENT_OF_PRINCIPAL']),
  amount: z.coerce.number().int().nonnegative(),
  applyAt: z.enum(['UPFRONT', 'PER_INSTALLMENT', 'END'])
});

export type CreateLoanProductFeeDto = z.infer<typeof createLoanProductFeeSchema>;
