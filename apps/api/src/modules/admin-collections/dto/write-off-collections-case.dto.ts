import { z } from 'zod';

export const writeOffCollectionsCaseSchema = z.object({
  note: z.string().trim().min(1).max(2000)
});

export type WriteOffCollectionsCaseDto = z.infer<typeof writeOffCollectionsCaseSchema>;

