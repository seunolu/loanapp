import { z } from 'zod';

export const reverseDisbursementSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

export type ReverseDisbursementDto = z.infer<typeof reverseDisbursementSchema>;
