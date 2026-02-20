import { Module } from '@nestjs/common';
import { LedgerGuardService } from './ledger-guard.service';
import { LedgerService } from './ledger.service';

@Module({
  providers: [LedgerService, LedgerGuardService],
  exports: [LedgerService, LedgerGuardService]
})
export class LedgerModule {}
