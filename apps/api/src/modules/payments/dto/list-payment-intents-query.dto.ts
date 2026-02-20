import { z } from 'zod';

export const listPaymentIntentsQuerySchema = z.object({
  direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
  status: z.enum(['CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED']).optional(),
  loanId: z.string().trim().min(1).optional(),
  borrowerId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().trim().min(1).optional()
});

export type ListPaymentIntentsQueryDto = z.infer<typeof listPaymentIntentsQuerySchema>;
