import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { LedgerModule } from '../../common/ledger/ledger.module';
import { AuthModule } from '../auth/auth.module';
import { LoansModule } from '../loans/loans.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackStubProvider } from './providers/paystack-stub.provider';
import { RepaymentProcessorService } from './repayment-processor.service';

@Module({
  imports: [AuthModule, AuditModule, IdempotencyModule, LedgerModule, LoansModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaystackStubProvider, RepaymentProcessorService],
  exports: [RepaymentProcessorService]
})
export class PaymentsModule {}
