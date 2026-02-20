import { z } from 'zod';

export const pauseLoanPenaltySchema = z.object({
  isPaused: z.boolean(),
  note: z.string().trim().min(1).max(2000)
});

export type PauseLoanPenaltyDto = z.infer<typeof pauseLoanPenaltySchema>;

