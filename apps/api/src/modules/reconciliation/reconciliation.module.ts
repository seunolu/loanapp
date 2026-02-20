import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { FinancialInvariantsService } from '../../common/finance/financial-invariants.service';
import { LedgerReconcileJob } from '../../common/finance/ledger-reconcile.job';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { LedgerModule } from '../../common/ledger/ledger.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationJobService } from './reconciliation.job';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [AdminAuthModule, AuditModule, LedgerModule, IdempotencyModule],
  controllers: [ReconciliationController],
  providers: [ReconciliationService, ReconciliationJobService, FinancialInvariantsService, LedgerReconcileJob],
  exports: [ReconciliationService]
})
export class ReconciliationModule {}
