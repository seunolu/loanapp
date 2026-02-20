import { z } from 'zod';

export const listReconciliationRunsQuerySchema = z.object({
  type: z.enum(['PAYMENT', 'DISBURSEMENT', 'SETTLEMENT']).optional(),
  status: z.enum(['RUNNING', 'COMPLETED', 'FAILED']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  skip: z.coerce.number().int().nonnegative().optional(),
  cursor: z.string().trim().min(1).optional()
});

export type ListReconciliationRunsQueryDto = z.infer<typeof listReconciliationRunsQuerySchema>;
