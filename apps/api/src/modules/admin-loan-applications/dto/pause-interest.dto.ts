import { z } from 'zod';

export const pauseInterestSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional()
});

export type PauseInterestDto = z.infer<typeof pauseInterestSchema>;
