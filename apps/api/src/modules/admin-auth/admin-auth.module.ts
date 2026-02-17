import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../../common/audit/audit.module';
import { RolesGuard } from '../../common/auth/roles.guard';
import { RequestContextModule } from '../../common/request-context/request-context.module';
import { TenantContextModule } from '../../common/tenant/tenant-context.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { TenantAdminAuthGuard } from './guards/tenant-admin-auth.guard';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { TenantAdminJwtStrategy } from './strategies/tenant-admin-jwt.strategy';

@Module({
  imports: [PassportModule, AuditModule, RequestContextModule, TenantContextModule],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminBootstrapService,
    AdminJwtStrategy,
    TenantAdminJwtStrategy,
    AdminAuthGuard,
    TenantAdminAuthGuard,
    RolesGuard
  ],
  exports: [AdminAuthGuard, TenantAdminAuthGuard, RolesGuard]
})
export class AdminAuthModule {}
