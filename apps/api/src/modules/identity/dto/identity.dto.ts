import { z } from 'zod';

export const recordConsentSchema = z.object({
  type: z.enum(['KYC_CONSENT', 'DATA_PROCESSING'])
});

export const verifyBvnSchema = z.object({
  bvn: z.string().regex(/^\d{11}$/, 'BVN must be 11 digits')
});

export type RecordConsentInput = z.infer<typeof recordConsentSchema>;
export type VerifyBvnInput = z.infer<typeof verifyBvnSchema>;

