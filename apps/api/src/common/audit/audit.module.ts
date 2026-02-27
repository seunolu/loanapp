import { Module } from '@nestjs/common';
import { RequestContextModule } from '../request-context/request-context.module';
import { AuditLoggerService } from './audit-logger.service';
import { AuditService } from './audit.service';

@Module({
  imports: [RequestContextModule],
  providers: [AuditService, AuditLoggerService],
  exports: [AuditService, AuditLoggerService]
})
export class AuditModule {}
