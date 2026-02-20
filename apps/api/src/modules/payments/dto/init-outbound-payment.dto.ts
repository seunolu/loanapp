import { z } from 'zod';

export const initOutboundPaymentSchema = z.object({
  disbursementId: z.string().trim().min(1),
  amountMinor: z.coerce.number().int().positive(),
  currency: z.string().trim().min(3).max(3).default('NGN'),
  idempotencyKey: z.string().trim().min(1).max(200),
  recipientCode: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500).optional()
});

export type InitOutboundPaymentDto = z.infer<typeof initOutboundPaymentSchema>;

