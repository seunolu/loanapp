import { z } from 'zod';

export const riskOverrideSchema = z.object({
  note: z.string().trim().min(1).max(2000)
});

export type RiskOverrideDto = z.infer<typeof riskOverrideSchema>;

