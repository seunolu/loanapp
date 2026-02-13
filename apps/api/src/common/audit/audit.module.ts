import { Module } from '@nestjs/common';
import { RequestContextModule } from '../request-context/request-context.module';
import { AuditService } from './audit.service';

@Module({
  imports: [RequestContextModule],
  providers: [AuditService],
  exports: [AuditService]
})
export class AuditModule {}
