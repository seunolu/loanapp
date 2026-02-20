import { z } from 'zod';

export const createSettlementBatchSchema = z.object({
  provider: z.string().trim().min(1).max(50),
  settlementDate: z.string().datetime(),
  currency: z.string().trim().min(3).max(10).default('NGN')
});

export type CreateSettlementBatchDto = z.infer<typeof createSettlementBatchSchema>;
