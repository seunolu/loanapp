import { z } from 'zod';

export const createLoanApplicationHoldSchema = z.object({
  type: z.enum([
    'FRAUD_SUSPECTED',
    'KYC_MISSING',
    'DOCUMENTS_MISSING',
    'POLICY_VIOLATION',
    'MANUAL_REVIEW',
    'COLLECTIONS_REVIEW',
    'SYSTEM_VELOCITY'
  ]),
  note: z.string().trim().max(2000).optional()
});

export type CreateLoanApplicationHoldDto = z.infer<typeof createLoanApplicationHoldSchema>;

