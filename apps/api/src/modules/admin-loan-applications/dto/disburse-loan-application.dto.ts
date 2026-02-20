import { z } from 'zod';

export const disburseLoanApplicationSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  method: z.enum(['BANK_TRANSFER', 'WALLET', 'CASH', 'MANUAL']).optional(),
  reference: z.string().trim().min(1).max(200).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  note: z.string().trim().min(1).max(500).optional(),
  forceFail: z.boolean().optional()
});

export type DisburseLoanApplicationDto = z.infer<typeof disburseLoanApplicationSchema>;
