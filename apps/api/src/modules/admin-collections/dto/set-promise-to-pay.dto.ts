import { z } from 'zod';

export const setPromiseToPaySchema = z.object({
  promiseToPayAt: z.string().datetime(),
  note: z.string().trim().min(1).max(2000).optional()
});

export type SetPromiseToPayDto = z.infer<typeof setPromiseToPaySchema>;

