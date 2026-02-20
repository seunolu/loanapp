import { z } from 'zod';

export const createCaseSchema = z.object({
  borrowerId: z.string().trim().min(1).optional(),
  loanApplicationId: z.string().trim().min(1).optional(),
  repaymentId: z.string().trim().min(1).optional(),
  disbursementId: z.string().trim().min(1).optional(),
  type: z.enum(['COMPLAINT', 'DISPUTE', 'REQUEST']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(5000),
  assignedToAdminUserId: z.string().trim().min(1).optional()
});

export const listCasesQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'AWAITING_BORROWER', 'ESCALATED', 'RESOLVED', 'REJECTED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToAdminUserId: z.string().trim().min(1).optional(),
  borrowerId: z.string().trim().min(1).optional(),
  loanApplicationId: z.string().trim().min(1).optional(),
  overdueOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export const createCaseMessageSchema = z.object({
  visibility: z.enum(['INTERNAL', 'BORROWER']),
  message: z.string().trim().min(1).max(5000)
});

export const transitionCaseSchema = z.object({
  toStatus: z.enum(['OPEN', 'IN_REVIEW', 'AWAITING_BORROWER', 'ESCALATED', 'RESOLVED', 'REJECTED', 'CLOSED']),
  reason: z.string().trim().max(1000).optional(),
  resolutionCode: z
    .enum([
      'REFUND_ISSUED',
      'WAIVER_GRANTED',
      'PAYMENT_REVERSED',
      'CORRECTION_MADE',
      'NO_ACTION_REQUIRED',
      'FRAUD_CONFIRMED',
      'FRAUD_NOT_CONFIRMED',
      'OTHER'
    ])
    .optional(),
  resolutionNotes: z.string().trim().max(5000).optional()
});

export const assignCaseSchema = z.object({
  adminUserId: z.string().trim().min(1).optional()
});

export const listBorrowerCasesQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'AWAITING_BORROWER', 'ESCALATED', 'RESOLVED', 'REJECTED', 'CLOSED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export const createBorrowerCaseSchema = z.object({
  type: z.enum(['COMPLAINT', 'DISPUTE', 'REQUEST']),
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  loanApplicationId: z.string().trim().min(1).optional(),
  repaymentId: z.string().trim().min(1).optional(),
  disbursementId: z.string().trim().min(1).optional()
});

export const createBorrowerCaseMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000)
});
