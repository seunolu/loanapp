import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './common/audit/audit.module';
import type { Env } from './common/config/env.schema';
import { validateEnv } from './common/config/validate-env';
import { DatabaseModule } from './common/database/database.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ProdDevEndpointsGuard } from './common/guards/prod-dev-endpoints.guard';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { JobsModule } from './common/jobs/jobs.module';
import { LedgerModule } from './common/ledger/ledger.module';
import { buildPinoHttpConfig } from './common/logger/pino-http.config';
import { GlobalRateLimitMiddleware } from './common/middleware/global-rate-limit.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { NotificationsModule } from './common/notifications/notifications.module';
import { RedisModule } from './common/redis/redis.module';
import { RiskModule } from './common/risk/risk.module';
import { RbacModule } from './common/rbac/rbac.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminDisbursementsModule } from './modules/admin-disbursements/admin-disbursements.module';
import { AdminBorrowersModule } from './modules/admin-borrowers/admin-borrowers.module';
import { AdminAuditLogsModule } from './modules/admin-audit-logs/admin-audit-logs.module';
import { AdminJobsModule } from './modules/admin-jobs/admin-jobs.module';
import { AdminLendersModule } from './modules/admin-lenders/admin-lenders.module';
import { AdminLoanApplicationsModule } from './modules/admin-loan-applications/admin-loan-applications.module';
import { AdminLoansModule } from './modules/admin-loans/admin-loans.module';
import { AdminMeModule } from './modules/admin-me/admin-me.module';
import { AdminRolesModule } from './modules/admin-roles/admin-roles.module';
import { AdminReportsModule } from './modules/admin-reports/admin-reports.module';
import { AdminUnderwritingModule } from './modules/admin-underwriting/admin-underwriting.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { AuthModule } from './modules/auth/auth.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { DevAuditController } from './modules/dev/dev-audit.controller';
import { DevIdempotencyController } from './modules/dev/dev-idempotency.controller';
import { DevLedgerController } from './modules/dev/dev-ledger.controller';
import { FilesModule } from './modules/files/files.module';
import { HealthController } from './modules/health/health.controller';
import { HealthService } from './modules/health/health.service';
import { KycModule } from './modules/kyc/kyc.module';
import { LoansModule } from './modules/loans/loans.module';
import { MeModule } from './modules/me/me.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PublicModule } from './modules/public/public.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LoanApplicationsModule } from './modules/loan-applications/loan-applications.module';
import { PlatformOnboardingModule } from './modules/platform-onboarding/platform-onboarding.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        pinoHttp: buildPinoHttpConfig(configService)
      })
    }),
    DatabaseModule,
    AuditModule,
    IdempotencyModule,
    LedgerModule,
    NotificationsModule,
    RedisModule,
    RiskModule,
    RbacModule,
    JobsModule,
    AuthModule,
    AdminAuthModule,
    AdminBorrowersModule,
    AdminAuditLogsModule,
    AdminLendersModule,
    AdminLoanApplicationsModule,
    AdminLoansModule,
    AdminMeModule,
    AdminReportsModule,
    AdminRolesModule,
    AdminUsersModule,
    AdminUnderwritingModule,
    AdminJobsModule,
    AdminDisbursementsModule,
    BankAccountsModule,
    MeModule,
    PublicModule,
    TenantsModule,
    LoanApplicationsModule,
    PlatformOnboardingModule,
    FilesModule,
    KycModule,
    LoansModule,
    PaymentsModule,
    WebhooksModule
  ],
  controllers: [HealthController, DevIdempotencyController, DevAuditController, DevLedgerController],
  providers: [
    HealthService,
    GlobalRateLimitMiddleware,
    GlobalExceptionFilter,
    {
      provide: APP_GUARD,
      useClass: ProdDevEndpointsGuard
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, GlobalRateLimitMiddleware).forRoutes('*');
  }
}
