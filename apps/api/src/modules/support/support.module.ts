import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { DatabaseModule } from '../../common/database/database.module';
import { LedgerModule } from '../../common/ledger/ledger.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [DatabaseModule, AuditModule, LedgerModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService]
})
export class SupportModule {}
