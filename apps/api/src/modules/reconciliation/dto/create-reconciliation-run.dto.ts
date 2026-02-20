import { z } from 'zod';

export const createReconciliationRunSchema = z.object({
  type: z.enum(['PAYMENT', 'DISBURSEMENT', 'SETTLEMENT']),
  days: z.coerce.number().int().positive().max(365).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export type CreateReconciliationRunDto = z.infer<typeof createReconciliationRunSchema>;

