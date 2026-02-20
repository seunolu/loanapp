import { z } from 'zod';

export const resolveReconciliationRecordSchema = z.object({
  resolutionType: z.enum(['MANUAL_ADJUSTMENT', 'WRITE_OFF', 'PROVIDER_ERROR', 'INTERNAL_ERROR', 'DUPLICATE', 'REFUND']),
  note: z.string().trim().min(1).max(2000).optional(),
  adjustment: z
    .object({
      lines: z
        .array(
          z.object({
            accountCode: z.string().trim().min(1),
            direction: z.enum(['DEBIT', 'CREDIT']),
            amount: z.coerce.number().positive()
          })
        )
        .min(2)
    })
    .optional()
});

export type ResolveReconciliationRecordDto = z.infer<typeof resolveReconciliationRecordSchema>;
