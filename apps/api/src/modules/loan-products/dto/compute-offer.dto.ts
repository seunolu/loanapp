import { z } from 'zod';

export const computeOfferSchema = z.object({
  principalMinor: z.coerce.number().int().positive(),
  tenorDays: z.coerce.number().int().positive(),
  startDate: z.string().datetime().optional()
});

export type ComputeOfferDto = z.infer<typeof computeOfferSchema>;
