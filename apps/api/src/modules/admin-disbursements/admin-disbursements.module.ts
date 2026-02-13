import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { LedgerModule } from '../../common/ledger/ledger.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminDisbursementsController } from './admin-disbursements.controller';
import { AdminDisbursementsService } from './admin-disbursements.service';

@Module({
  imports: [AdminAuthModule, AuditModule, LedgerModule, IdempotencyModule],
  controllers: [AdminDisbursementsController],
  providers: [AdminDisbursementsService]
})
export class AdminDisbursementsModule {}
