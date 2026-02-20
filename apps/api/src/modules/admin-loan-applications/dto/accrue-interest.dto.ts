import { z } from 'zod';

export const accrueInterestSchema = z.object({
  throughDate: z.string().date()
});

export type AccrueInterestDto = z.infer<typeof accrueInterestSchema>;
