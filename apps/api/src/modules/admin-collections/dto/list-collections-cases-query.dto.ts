import { z } from 'zod';

export const listCollectionsCasesQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PROMISE_TO_PAY', 'BROKEN_PTP', 'RESOLVED', 'CLOSED', 'WRITTEN_OFF']).optional(),
  stage: z.enum(['SOFT', 'FIELD', 'LEGAL']).optional(),
  assignedTo: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(200).optional()
});

export type ListCollectionsCasesQueryDto = z.infer<typeof listCollectionsCasesQuerySchema>;

