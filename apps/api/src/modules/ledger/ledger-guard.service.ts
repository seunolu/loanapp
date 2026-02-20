import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerAccountType } from '@prisma/client';

type GuardLine = {
  accountId: string;
  debitMinor?: number;
  creditMinor?: number;
};

@Injectable()
export class LedgerGuardService {
  validateTransactionBalanced(entries: GuardLine[]): void {
    const debit = entries.reduce((sum, item) => sum + Math.max(0, item.debitMinor ?? 0), 0);
    const credit = entries.reduce((sum, item) => sum + Math.max(0, item.creditMinor ?? 0), 0);
    if (debit !== credit) {
      throw new BadRequestException({
        code: 'LEDGER_UNBALANCED',
        message: 'Ledger transaction is not balanced.',
        details: { debitMinor: debit, creditMinor: credit }
      });
    }
  }

  assertNoNegativeBalance(params: {
    accountType: LedgerAccountType;
    balanceMinor: number;
    allowNegative?: boolean;
  }): void {
    if (params.allowNegative) {
      return;
    }
    if (params.balanceMinor < 0 && params.accountType === LedgerAccountType.ASSET) {
      throw new BadRequestException({
        code: 'LEDGER_NEGATIVE_BALANCE',
        message: 'Negative asset balances are not allowed.',
        details: { accountType: params.accountType, balanceMinor: params.balanceMinor }
      });
    }
  }
}

