import { z } from 'zod';

export const removeInterestOverrideSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional()
});

export type RemoveInterestOverrideDto = z.infer<typeof removeInterestOverrideSchema>;
