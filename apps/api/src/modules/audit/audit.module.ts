import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { RequestContextModule } from '../../common/request-context/request-context.module';
import { AuditWriterService } from './audit-writer.service';

@Module({
  imports: [DatabaseModule, RequestContextModule],
  providers: [AuditWriterService],
  exports: [AuditWriterService]
})
export class ComplianceAuditModule {}

