import { z } from 'zod';

export const listReconciliationRecordsQuerySchema = z.object({
  status: z.enum(['MATCHED', 'MISMATCH', 'SUSPENSE', 'RESOLVED', 'WRITE_OFF']).optional(),
  batchId: z.string().trim().min(1).optional(),
  provider: z.string().trim().min(1).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  skip: z.coerce.number().int().nonnegative().optional(),
  cursor: z.string().trim().min(1).optional()
});

export type ListReconciliationRecordsQueryDto = z.infer<typeof listReconciliationRecordsQuerySchema>;
