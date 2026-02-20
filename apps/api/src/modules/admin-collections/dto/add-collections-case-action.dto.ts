import { z } from 'zod';

export const addCollectionsCaseActionSchema = z.object({
  type: z.enum(['CALL', 'SMS', 'WHATSAPP', 'EMAIL', 'VISIT', 'NOTE', 'PTP_SET', 'PTP_BROKEN', 'DISPUTE', 'WAIVER', 'WRITE_OFF', 'OTHER']),
  note: z.string().trim().min(1).max(2000),
  metadata: z.record(z.any()).optional()
});

export type AddCollectionsCaseActionDto = z.infer<typeof addCollectionsCaseActionSchema>;

