import { z } from 'zod';

export const dashboardActivityTypeSchema = z.enum([
  'LOAN_SUBMITTED',
  'LOAN_APPROVED',
  'LOAN_DISBURSED',
  'REPAYMENT_RECEIVED',
  'LOAN_DEFAULTED'
]);

export const dashboardRecentActivityQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(5)
  })
  .strict();

export const dashboardActivityItemSchema = z.object({
  id: z.string(),
  type: dashboardActivityTypeSchema,
  title: z.string(),
  createdAt: z.string().datetime(),
  loanApplicationId: z.string().optional(),
  amount: z.number().optional()
});

export const dashboardRecentActivityResponseSchema = z.array(dashboardActivityItemSchema);

export type DashboardActivityType = z.infer<typeof dashboardActivityTypeSchema>;
export type DashboardRecentActivityQueryDto = z.infer<typeof dashboardRecentActivityQuerySchema>;
export type DashboardActivityItemDto = z.infer<typeof dashboardActivityItemSchema>;
