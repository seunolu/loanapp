import {
  LedgerAccountType,
  TenantLedgerAccountCode,
  TenantLedgerNormalBalance
} from '@prisma/client';

export type TenantLedgerAccountSeed = {
  code: TenantLedgerAccountCode;
  name: string;
  type: LedgerAccountType;
  normalBalance: TenantLedgerNormalBalance;
  currency: string;
  isSystem: boolean;
};

export const TENANT_LEDGER_DEFAULT_ACCOUNTS: TenantLedgerAccountSeed[] = [
  {
    code: TenantLedgerAccountCode.CASH_MAIN,
    name: 'Cash Main',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.CASH,
    name: 'Cash (Legacy)',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE,
    name: 'Loan Principal Receivable',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.LOANS_RECEIVABLE,
    name: 'Loans Receivable',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.LOAN_CLEARING,
    name: 'Loan Clearing',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.INTEREST_RECEIVABLE,
    name: 'Interest Receivable',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.INTEREST_INCOME,
    name: 'Interest Income',
    type: LedgerAccountType.INCOME,
    normalBalance: TenantLedgerNormalBalance.CREDIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.FEES_RECEIVABLE,
    name: 'Fees Receivable',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.FEE_INCOME,
    name: 'Fee Income',
    type: LedgerAccountType.INCOME,
    normalBalance: TenantLedgerNormalBalance.CREDIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.PENALTY_INCOME,
    name: 'Penalty Income',
    type: LedgerAccountType.INCOME,
    normalBalance: TenantLedgerNormalBalance.CREDIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.CASH_ON_HAND,
    name: 'Cash On Hand',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.BANK_CLEARING,
    name: 'Bank Clearing',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.WALLET_CLEARING,
    name: 'Wallet Clearing',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.SUSPENSE,
    name: 'Suspense',
    type: LedgerAccountType.LIABILITY,
    normalBalance: TenantLedgerNormalBalance.CREDIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.WRITE_OFF_EXPENSE,
    name: 'Write Off Expense',
    type: LedgerAccountType.EXPENSE,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.CAPITAL_POOL_AVAILABLE,
    name: 'Capital Pool Available',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.CAPITAL_POOL_DEPLOYED,
    name: 'Capital Pool Deployed',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.CAPITAL_POOL_REPAID,
    name: 'Capital Pool Repaid',
    type: LedgerAccountType.ASSET,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  },
  {
    code: TenantLedgerAccountCode.CAPITAL_POOL_LOSSES,
    name: 'Capital Pool Losses',
    type: LedgerAccountType.EXPENSE,
    normalBalance: TenantLedgerNormalBalance.DEBIT,
    currency: 'NGN',
    isSystem: true
  }
];
