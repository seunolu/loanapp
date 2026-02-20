import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { LedgerModule as CommonLedgerModule } from '../../common/ledger/ledger.module';
import { TenantContextModule } from '../../common/tenant/tenant-context.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { LedgerModule as FinancialLedgerModule } from '../ledger/ledger.module';
import { RiskEngineModule } from '../../risk/risk.module';
import { FraudModule } from '../fraud/fraud.module';
import { RequestContextModule } from '../../common/request-context/request-context.module';
import { TreasuryModule } from '../../treasury/treasury.module';
import { LoanDecisionOrchestratorService } from './decision/loan-decision-orchestrator.service';
import { LoanApplicationsController } from './loan-applications.controller';
import { LoanApplicationsService } from './loan-applications.service';

@Module({
  imports: [TenantContextModule, AuditModule, AdminAuthModule, CommonLedgerModule, FinancialLedgerModule, RiskEngineModule, FraudModule, RequestContextModule, TreasuryModule],
  controllers: [LoanApplicationsController],
  providers: [LoanApplicationsService, LoanDecisionOrchestratorService],
  exports: [LoanApplicationsService, LoanDecisionOrchestratorService]
})
export class LoanApplicationsModule {}
