import { z } from 'zod';

export const closeCollectionsCaseSchema = z.object({
  resolutionNote: z.string().trim().min(1).max(2000)
});

export type CloseCollectionsCaseDto = z.infer<typeof closeCollectionsCaseSchema>;

