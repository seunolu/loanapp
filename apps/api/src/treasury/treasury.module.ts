import { Module } from '@nestjs/common';
import { AuditModule } from '../common/audit/audit.module';
import { LedgerModule } from '../common/ledger/ledger.module';
import { TreasuryExposureGuard } from './exposure/treasury-exposure.guard';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';

@Module({
  imports: [LedgerModule, AuditModule],
  providers: [TreasuryService, TreasuryExposureGuard],
  controllers: [TreasuryController],
  exports: [TreasuryService]
})
export class TreasuryModule {}

