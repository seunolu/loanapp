import { z } from 'zod';

export const initInboundPaymentSchema = z.object({
  borrowerId: z.string().trim().min(1).optional(),
  loanId: z.string().trim().min(1).optional(),
  amountMinor: z.coerce.number().int().positive(),
  currency: z.string().trim().min(3).max(3).default('NGN'),
  idempotencyKey: z.string().trim().min(1).max(200)
});

export type InitInboundPaymentDto = z.infer<typeof initInboundPaymentSchema>;

