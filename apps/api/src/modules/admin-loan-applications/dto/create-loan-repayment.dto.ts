import { z } from 'zod';

export const createLoanRepaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  postedAt: z.string().datetime().optional(),
  channel: z.enum(['MANUAL', 'BANK_TRANSFER', 'CARD', 'USSD', 'CASH']).optional(),
  reference: z.string().trim().min(1).max(200).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional()
});

export type CreateLoanRepaymentDto = z.infer<typeof createLoanRepaymentSchema>;
