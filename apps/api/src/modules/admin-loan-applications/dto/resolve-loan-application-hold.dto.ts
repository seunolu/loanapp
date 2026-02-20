import { z } from 'zod';

export const resolveLoanApplicationHoldSchema = z.object({
  resolutionNote: z.string().trim().max(2000).optional()
});

export type ResolveLoanApplicationHoldDto = z.infer<typeof resolveLoanApplicationHoldSchema>;

