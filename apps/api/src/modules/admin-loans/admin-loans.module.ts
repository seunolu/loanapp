import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { LedgerModule } from '../../common/ledger/ledger.module';
import { OfferCalculatorModule } from '../../common/offer-calculator/offer-calculator.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { LoansModule } from '../loans/loans.module';
import { AdminLoansController } from './admin-loans.controller';
import { AdminLoansService } from './admin-loans.service';
import { PenaltyService } from './penalty.service';

@Module({
  imports: [AdminAuthModule, AuditModule, LoansModule, LedgerModule, OfferCalculatorModule],
  controllers: [AdminLoansController],
  providers: [AdminLoansService, PenaltyService],
  exports: [PenaltyService]
})
export class AdminLoansModule {}
