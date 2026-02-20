import { z } from 'zod';

export const createLedgerAdjustmentSchema = z.object({
  loanApplicationId: z.string().trim().min(1).optional(),
  memo: z.string().trim().min(1).max(500),
  idempotencyKey: z.string().trim().min(1).max(200),
  lines: z
    .array(
      z.object({
        accountCode: z.enum([
          'CASH',
          'LOAN_PRINCIPAL_RECEIVABLE',
          'LOAN_CLEARING',
          'INTEREST_RECEIVABLE',
          'INTEREST_INCOME',
          'FEES_RECEIVABLE',
          'FEE_INCOME',
          'CASH_ON_HAND',
          'BANK_CLEARING',
          'WALLET_CLEARING',
          'SUSPENSE'
        ]),
        direction: z.enum(['DEBIT', 'CREDIT']),
        amount: z.coerce.number().positive()
      })
    )
    .min(2)
});

export type CreateLedgerAdjustmentDto = z.infer<typeof createLedgerAdjustmentSchema>;
