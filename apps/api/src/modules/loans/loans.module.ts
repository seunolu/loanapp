import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { AuthModule } from '../auth/auth.module';
import { LoanApplicationsModule } from '../loan-applications/loan-applications.module';
import { DelinquencyEngineService } from './delinquency/delinquency-engine.service';
import { DelinquencyJob } from './delinquency/delinquency.job';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { OverdueService } from './overdue.service';

@Module({
  imports: [AuthModule, AuditModule, IdempotencyModule, LoanApplicationsModule],
  controllers: [LoansController],
  providers: [LoansService, OverdueService, DelinquencyEngineService, DelinquencyJob],
  exports: [OverdueService, DelinquencyEngineService]
})
export class LoansModule {}
