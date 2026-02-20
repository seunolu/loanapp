import { z } from 'zod';

export const retryDisbursementSchema = z.object({
  note: z.string().trim().min(1).max(500).optional(),
  forceFail: z.boolean().optional()
});

export type RetryDisbursementDto = z.infer<typeof retryDisbursementSchema>;
