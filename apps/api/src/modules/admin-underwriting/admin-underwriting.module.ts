import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminUnderwritingController } from './admin-underwriting.controller';
import { AdminUnderwritingService } from './admin-underwriting.service';

@Module({
  imports: [AdminAuthModule, AuditModule],
  controllers: [AdminUnderwritingController],
  providers: [AdminUnderwritingService]
})
export class AdminUnderwritingModule {}
