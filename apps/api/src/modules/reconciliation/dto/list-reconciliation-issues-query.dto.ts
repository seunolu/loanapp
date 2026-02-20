import { z } from 'zod';

export const listReconciliationIssuesQuerySchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z
    .enum(['MISSING_LEDGER', 'DUPLICATE_LEDGER', 'AMOUNT_MISMATCH', 'STATUS_MISMATCH', 'UNKNOWN_REFERENCE', 'FEE_MISMATCH'])
    .optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  skip: z.coerce.number().int().nonnegative().optional(),
  cursor: z.string().trim().min(1).optional()
});

export type ListReconciliationIssuesQueryDto = z.infer<typeof listReconciliationIssuesQuerySchema>;
