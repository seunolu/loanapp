import { z } from 'zod';

export const setupMandateSchema = z.object({
  loanId: z.string().trim().min(1),
  maxAmount: z.coerce.number().positive().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional()
});

export type SetupMandateDto = z.infer<typeof setupMandateSchema>;

export const listMandatesQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'FAILED']).optional(),
  borrowerId: z.string().trim().min(1).optional(),
  loanId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().trim().min(1).optional()
});

export type ListMandatesQueryDto = z.infer<typeof listMandatesQuerySchema>;

export const mandateAdminActionSchema = z.object({
  reason: z.string().trim().min(3).max(300).optional()
});

export type MandateAdminActionDto = z.infer<typeof mandateAdminActionSchema>;
