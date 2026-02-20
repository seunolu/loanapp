import { z } from 'zod';

export const listSettlementBatchesQuerySchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  skip: z.coerce.number().int().nonnegative().optional(),
  cursor: z.string().trim().min(1).optional()
});

export type ListSettlementBatchesQueryDto = z.infer<typeof listSettlementBatchesQuerySchema>;
