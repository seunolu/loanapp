import { z } from 'zod';

export const riskRuleOperatorSchema = z.enum([
  'eq',
  'ne',
  'in',
  'nin',
  'gt',
  'gte',
  'lt',
  'lte',
  'exists'
]);

export const riskRuleSchema = z.object({
  code: z.string().trim().min(1).max(100),
  field: z.string().trim().min(1).max(120),
  operator: riskRuleOperatorSchema,
  value: z.unknown().optional(),
  message: z.string().trim().min(1).max(300),
  delta: z.number().int().min(-500).max(500).optional()
});

const weightSchema = z.number().int().min(0).max(100);

export const riskPolicyConfigSchema = z.object({
  weights: z.object({
    employmentStatusWeight: weightSchema,
    incomeBandWeight: weightSchema,
    repaymentHistoryWeight: weightSchema,
    deviceTrustWeight: weightSchema.optional().default(10),
    kycLevelWeight: weightSchema
  }),
  thresholds: z
    .object({
      approveMinScore: z.number().int().min(0).max(1000),
      reviewMinScore: z.number().int().min(0).max(1000)
    })
    .refine((value) => value.approveMinScore >= value.reviewMinScore, {
      message: 'approveMinScore must be >= reviewMinScore',
      path: ['approveMinScore']
    }),
  rules: z.object({
    hardDeclines: z.array(riskRuleSchema).default([]),
    softFlags: z.array(riskRuleSchema).default([])
  })
});

export type RiskPolicyConfig = z.infer<typeof riskPolicyConfigSchema>;

export const defaultRiskPolicyConfig: RiskPolicyConfig = {
  weights: {
    employmentStatusWeight: 20,
    incomeBandWeight: 20,
    repaymentHistoryWeight: 25,
    deviceTrustWeight: 10,
    kycLevelWeight: 25
  },
  thresholds: {
    approveMinScore: 700,
    reviewMinScore: 550
  },
  rules: {
    hardDeclines: [
      {
        code: 'HARD_DEFAULTED_BORROWER',
        field: 'borrower.hasActiveDefault',
        operator: 'eq',
        value: true,
        message: 'Borrower has active/defaulted loan exposure.'
      }
    ],
    softFlags: [
      {
        code: 'SOFT_LOW_ONTIME_RATE',
        field: 'repaymentStats.onTimeRate',
        operator: 'lt',
        value: 0.7,
        message: 'Repayment punctuality is below preferred threshold.',
        delta: -120
      },
      {
        code: 'SOFT_HIGH_REQUEST',
        field: 'application.requestedAmount',
        operator: 'gt',
        value: 500000,
        message: 'Requested amount is high and requires manual review.',
        delta: -80
      }
    ]
  }
};

