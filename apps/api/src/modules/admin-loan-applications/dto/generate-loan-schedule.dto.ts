import { z } from 'zod';

export const generateLoanScheduleSchema = z.object({
  interestMethod: z.enum(['REDUCING_BALANCE', 'FLAT']).optional()
});

export type GenerateLoanScheduleDto = z.infer<typeof generateLoanScheduleSchema>;
