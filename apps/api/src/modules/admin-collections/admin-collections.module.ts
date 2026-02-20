import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { LedgerModule } from '../../common/ledger/ledger.module';
import { CollectionsModule } from '../collections/collections.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminCollectionsController } from './admin-collections.controller';
import { AdminCollectionsService } from './admin-collections.service';
import { AdminLoansPenaltyController } from './admin-loans-penalty.controller';

@Module({
  imports: [AdminAuthModule, CollectionsModule, LedgerModule, AuditModule],
  controllers: [AdminCollectionsController, AdminLoansPenaltyController],
  providers: [AdminCollectionsService]
})
export class AdminCollectionsModule {}
