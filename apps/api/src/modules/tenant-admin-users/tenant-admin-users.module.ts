import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { TenantAdminUsersController } from './tenant-admin-users.controller';
import { TenantAdminUsersService } from './tenant-admin-users.service';

@Module({
  imports: [AdminAuthModule, AuditModule],
  controllers: [TenantAdminUsersController],
  providers: [TenantAdminUsersService]
})
export class TenantAdminUsersModule {}
