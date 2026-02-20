import { z } from 'zod';

export const disburseLoanNowSchema = z.object({
  method: z.enum(['BANK_TRANSFER', 'WALLET', 'MANUAL']).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  note: z.string().trim().min(1).max(500).optional(),
  forceFail: z.boolean().optional()
});

export type DisburseLoanNowDto = z.infer<typeof disburseLoanNowSchema>;
