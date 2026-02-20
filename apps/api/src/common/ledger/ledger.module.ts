import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerLockService } from './ledger-lock.service';
import { LoanBalanceService } from './loan-balance.service';
import { TenantLedgerAccountsService } from './tenant-ledger-accounts.service';
import { TenantLedgerService } from './tenant-ledger.service';

@Module({
  providers: [LedgerService, TenantLedgerAccountsService, TenantLedgerService, LoanBalanceService, LedgerLockService],
  exports: [LedgerService, TenantLedgerAccountsService, TenantLedgerService, LoanBalanceService, LedgerLockService]
})
export class LedgerModule {}
