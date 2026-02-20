import { z } from 'zod';

export const updateReconciliationIssueSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'RESOLVED', 'ESCALATED']),
  note: z.string().trim().min(1).max(1000).optional()
});

export type UpdateReconciliationIssueDto = z.infer<typeof updateReconciliationIssueSchema>;

