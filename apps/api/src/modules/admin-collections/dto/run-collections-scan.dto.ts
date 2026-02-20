import { z } from 'zod';

export const runCollectionsScanSchema = z.object({
  now: z.string().datetime().optional()
});

export type RunCollectionsScanDto = z.infer<typeof runCollectionsScanSchema>;

