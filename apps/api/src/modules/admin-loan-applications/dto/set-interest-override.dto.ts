import { z } from 'zod';

export const setInterestOverrideSchema = z.object({
  rate: z.coerce.number().positive().max(1000),
  reason: z.string().trim().min(1).max(500).optional()
});

export type SetInterestOverrideDto = z.infer<typeof setInterestOverrideSchema>;
