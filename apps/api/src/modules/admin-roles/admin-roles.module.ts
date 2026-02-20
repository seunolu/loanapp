import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { ComplianceAuditModule } from '../audit/audit.module';
import { AdminRolesController } from './admin-roles.controller';
import { AdminRolesService } from './admin-roles.service';

@Module({
  imports: [AdminAuthModule, AuditModule, ComplianceAuditModule],
  controllers: [AdminRolesController],
  providers: [AdminRolesService]
})
export class AdminRolesModule {}
