import { z } from 'zod';

export const createSupportCaseSchema = z.object({
  title: z.string().trim().min(3).max(160),
  loanId: z.string().trim().min(1).optional(),
  borrowerId: z.string().trim().min(1).optional()
});

export const listSupportCasesQuerySchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  loanId: z.string().trim().min(1).optional(),
  borrowerId: z.string().trim().min(1).optional()
});

export const createSupportNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  evidenceUrl: z.string().url().optional()
});

export const createSupportActionSchema = z.object({
  type: z.enum([
    'PAUSE_INTEREST',
    'RESUME_INTEREST',
    'APPLY_WAIVER',
    'APPLY_FEE',
    'RESCHEDULE_PLAN',
    'LEDGER_REVERSAL',
    'NOTE'
  ]),
  reason: z.string().trim().min(3).max(400),
  payload: z.record(z.string(), z.unknown()).default({})
});

export const approveSupportActionSchema = z.object({
  decisionNote: z.string().trim().max(500).optional()
});

export const rejectSupportActionSchema = z.object({
  decisionNote: z.string().trim().min(3).max(500)
});

export type CreateSupportCaseDto = z.infer<typeof createSupportCaseSchema>;
export type ListSupportCasesQueryDto = z.infer<typeof listSupportCasesQuerySchema>;
export type CreateSupportNoteDto = z.infer<typeof createSupportNoteSchema>;
export type CreateSupportActionDto = z.infer<typeof createSupportActionSchema>;
export type ApproveSupportActionDto = z.infer<typeof approveSupportActionSchema>;
export type RejectSupportActionDto = z.infer<typeof rejectSupportActionSchema>;

