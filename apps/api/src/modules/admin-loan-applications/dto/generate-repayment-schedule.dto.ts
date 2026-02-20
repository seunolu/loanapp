import { z } from 'zod';

export const generateRepaymentScheduleSchema = z.object({
  termMonths: z.coerce.number().int().min(1).max(120),
  annualInterestRate: z.coerce.number().min(0).max(200),
  startDate: z.string().datetime().optional(),
  fees: z.coerce.number().min(0).optional()
});

export type GenerateRepaymentScheduleDto = z.infer<typeof generateRepaymentScheduleSchema>;
