import { z } from 'zod';

export const waiveLoanPenaltySchema = z.object({
  amount: z.coerce.number().positive(),
  note: z.string().trim().min(1).max(2000)
});

export type WaiveLoanPenaltyDto = z.infer<typeof waiveLoanPenaltySchema>;

