import { z } from 'zod';

export const createCollectionActivitySchema = z.object({
  actionType: z.enum(['CALL', 'SMS', 'EMAIL', 'VISIT', 'NOTE']),
  note: z.string().trim().max(2000).optional()
});

export type CreateCollectionActivityDto = z.infer<typeof createCollectionActivitySchema>;
