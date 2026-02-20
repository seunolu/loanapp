import { z } from 'zod';

export const transitionLoanApplicationSchema = z.object({
  toStatus: z.enum([
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'REQUESTED_DOCUMENTS',
    'APPROVED',
    'READY_FOR_DISBURSEMENT',
    'DISBURSED',
    'OVERDUE',
    'WRITTEN_OFF',
    'SETTLED',
    'REPAID',
    'DEFAULTED',
    'REJECTED'
  ]),
  note: z.string().trim().min(1).max(500).optional()
});

export type TransitionLoanApplicationDto = z.infer<typeof transitionLoanApplicationSchema>;
