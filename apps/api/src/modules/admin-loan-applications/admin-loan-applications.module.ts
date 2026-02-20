import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { LedgerModule } from '../../common/ledger/ledger.module';
import { TenantContextModule } from '../../common/tenant/tenant-context.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CollectionsModule } from '../collections/collections.module';
import { LoanApplicationsModule } from '../loan-applications/loan-applications.module';
import { RepaymentService } from '../../loan/repayment/repayment.service';
import { AdminLedgerController } from './admin-ledger.controller';
import { AdminLedgerService } from './admin-ledger.service';
import { AdminFinancialReportsController } from './admin-financial-reports.controller';
import { AdminFinancialReportsService } from './admin-financial-reports.service';
import { AdminLoanApplicationsController } from './admin-loan-applications.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditsController } from './admin-audits.controller';
import { AdminObservabilityController } from './admin-observability.controller';
import { AdminRiskHoldsController } from './admin-risk-holds.controller';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';
import { AdminTenantDisbursementsController } from './admin-tenant-disbursements.controller';
import { LoanInterestControlService } from './loan-interest-control.service';
import { AdminObservabilityService } from './admin-observability.service';
import { AdminAuditsService } from './admin-audits.service';
import { RiskEngineModule } from '../../risk/risk.module';
import { FraudModule } from '../fraud/fraud.module';
import { JobsModule } from '../../common/jobs/jobs.module';
import { RequestContextModule } from '../../common/request-context/request-context.module';
import { PaymentsModule } from '../payments/payments.module';
import { FinancialInvariantsService } from '../../common/finance/financial-invariants.service';
import { TreasuryModule } from '../../treasury/treasury.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [AdminAuthModule, TenantContextModule, LoanApplicationsModule, CollectionsModule, LedgerModule, AuditModule, IdempotencyModule, RiskEngineModule, FraudModule, JobsModule, RequestContextModule, PaymentsModule, TreasuryModule, ComplianceModule, IdentityModule],
  controllers: [
    AdminLoanApplicationsController,
    AdminTenantDisbursementsController,
    AdminLedgerController,
    AdminRiskHoldsController,
    AdminAuditsController,
    AdminObservabilityController,
    AdminFinancialReportsController,
    AdminAuditController
  ],
  providers: [
    AdminLoanApplicationsService,
    AdminLedgerService,
    AdminFinancialReportsService,
    AdminAuditsService,
    AdminObservabilityService,
    RepaymentService,
    FinancialInvariantsService,
    LoanInterestControlService
  ]
})
export class AdminLoanApplicationsModule {}
