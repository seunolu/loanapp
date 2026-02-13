import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../../common/audit/audit.module';
import { RequestContextModule } from '../../common/request-context/request-context.module';
import { TenantContextModule } from '../../common/tenant/tenant-context.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BorrowerAuthGuard } from './guards/borrower-auth.guard';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { BorrowerJwtStrategy } from './strategies/borrower-jwt.strategy';

@Module({
  imports: [AuditModule, RequestContextModule, TenantContextModule, PassportModule],
  controllers: [AuthController],
  providers: [AuthService, OtpRateLimitService, BorrowerJwtStrategy, BorrowerAuthGuard],
  exports: [BorrowerAuthGuard]
})
export class AuthModule {}
