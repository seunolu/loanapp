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
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

@Module({
  imports: [PassportModule, AuditModule, RequestContextModule, TenantContextModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminBootstrapService, AdminJwtStrategy, AdminAuthGuard, RolesGuard],
  exports: [AdminAuthGuard, RolesGuard]
})
export class AdminAuthModule {}
