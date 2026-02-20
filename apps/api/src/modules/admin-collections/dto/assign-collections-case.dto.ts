import { z } from 'zod';

export const assignCollectionsCaseSchema = z.object({
  adminUserId: z.string().trim().min(1)
});

export type AssignCollectionsCaseDto = z.infer<typeof assignCollectionsCaseSchema>;

