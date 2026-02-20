import { z } from 'zod';

export const createHardshipRequestSchema = z
  .object({
    loanApplicationId: z.string().trim().min(1),
    type: z.enum(['PAYMENT_PAUSE', 'TENOR_EXTENSION', 'RATE_REDUCTION']),
    reason: z.string().trim().min(3).max(5000),
    proposedTenorMonths: z.coerce.number().int().min(1).max(120).optional(),
    proposedRate: z.coerce.number().positive().max(100).optional(),
    pauseDays: z.coerce.number().int().min(1).max(180).optional()
  })
  .superRefine((value, ctx) => {
    if (value.type === 'PAYMENT_PAUSE' && !value.pauseDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pauseDays'],
        message: 'pauseDays is required for PAYMENT_PAUSE'
      });
    }
    if (value.type === 'TENOR_EXTENSION' && !value.proposedTenorMonths) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposedTenorMonths'],
        message: 'proposedTenorMonths is required for TENOR_EXTENSION'
      });
    }
    if (value.type === 'RATE_REDUCTION' && !value.proposedRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposedRate'],
        message: 'proposedRate is required for RATE_REDUCTION'
      });
    }
  });

export const listBorrowerHardshipQuerySchema = z.object({
  status: z.enum(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export const listAdminHardshipQuerySchema = z.object({
  status: z.enum(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export const transitionHardshipSchema = z.object({
  toStatus: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  decisionNotes: z.string().trim().max(5000).optional()
});

