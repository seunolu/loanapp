import { z } from 'zod';

export const runReconciliationJobSchema = z.object({
  provider: z.string().trim().min(1).default('PAYSTACK'),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime()
});

export type RunReconciliationJobDto = z.infer<typeof runReconciliationJobSchema>;
