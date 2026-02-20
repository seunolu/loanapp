import { z } from 'zod';

export const repayLoanApplicationSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(['BANK_TRANSFER', 'CARD', 'WALLET', 'CASH']),
  reference: z.string().trim().min(1).max(200).optional(),
  paidAt: z.string().datetime().optional(),
  idempotencyKey: z.string().trim().min(1).max(200)
});

export type RepayLoanApplicationDto = z.infer<typeof repayLoanApplicationSchema>;
