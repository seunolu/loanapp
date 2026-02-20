import { z } from 'zod';

export const listFraudAlertsQuerySchema = z.object({
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE', 'ESCALATED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  onlyOpen: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true')
});

export const updateFraudAlertSchema = z.object({
  status: z.enum(['INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE', 'ESCALATED']),
  resolutionNotes: z.string().trim().max(1000).optional()
});

export const manualFraudFlagSchema = z.object({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  note: z.string().trim().max(1000).optional()
});

export const fraudQueueQuerySchema = z.object({
  level: z.enum(['HIGH', 'SEVERE']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  skip: z.coerce.number().int().nonnegative().optional(),
  cursor: z.string().trim().min(1).optional()
});

export const fraudBorrowerHoldBodySchema = z.object({
  reason: z.string().trim().min(3).max(500)
});
