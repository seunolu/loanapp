import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './common/audit/audit.module';
import { EventsModule } from './common/events/events.module';
import type { Env } from './common/config/env.schema';
import { validateEnv } from './common/config/validate-env';
import { DatabaseModule } from './common/database/database.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ProdDevEndpointsGuard } from './common/guards/prod-dev-endpoints.guard';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { JobsModule } from './common/jobs/jobs.module';
import { LedgerModule } from './common/ledger/ledger.module';
import { LocksModule } from './common/locks/locks.module';
import { buildPinoHttpConfig } from './common/logger/pino-http.config';
import { GlobalRateLimitMiddleware } from './common/middleware/global-rate-limit.middleware';
import { RedisRateLimitMiddleware } from './common/rate-limit/redis-rate-limit.middleware';
import { RateLimitGuard } from './common/rate-limit/rate-limit.guard';
import { RateLimitPolicyService } from './common/rate-limit/rate-limit.policy';
import { FeatureFlagModule } from './common/feature-flags/feature-flag.module';
import { HttpMetricsInterceptor } from './common/interceptors/http-metrics.interceptor';
import { RequestLogContextInterceptor } from './common/interceptors/request-log-context.interceptor';
import { IntegrationsModule } from './integrations/integrations.module';
import { MetricsModule } from './common/observability/metrics.module';
import { RequestContextModule } from './common/request-context/request-context.module';
import { RequestContextMiddleware } from './common/request-context/request-context.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { NotificationsModule } from './common/notifications/notifications.module';
import { RedisModule } from './common/redis/redis.module';
import { RiskModule } from './common/risk/risk.module';
import { RbacModule } from './common/rbac/rbac.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminCollectionsModule } from './modules/admin-collections/admin-collections.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { AdminDisbursementsModule } from './modules/admin-disbursements/admin-disbursements.module';
import { AdminConfirmationsModule } from './modules/admin-confirmations/admin-confirmations.module';
import { AdminBorrowersModule } from './modules/admin-borrowers/admin-borrowers.module';
import { AdminAuditLogsModule } from './modules/admin-audit-logs/admin-audit-logs.module';
import { AdminJobsModule } from './modules/admin-jobs/admin-jobs.module';
import { AdminOpsModule } from './modules/admin-ops/admin-ops.module';
import { AdminLendersModule } from './modules/admin-lenders/admin-lenders.module';
import { AdminLoanApplicationsModule } from './modules/admin-loan-applications/admin-loan-applications.module';
import { AdminLoansModule } from './modules/admin-loans/admin-loans.module';
import { AdminMeModule } from './modules/admin-me/admin-me.module';
import { AdminRolesModule } from './modules/admin-roles/admin-roles.module';
import { AdminReportsModule } from './modules/admin-reports/admin-reports.module';
import { AdminUnderwritingModule } from './modules/admin-underwriting/admin-underwriting.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { PortfolioModule } from './modules/admin/portfolio/portfolio.module';
import { AuthModule } from './modules/auth/auth.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { CaseManagementModule } from './modules/case-management/case-management.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { DevAuditController } from './modules/dev/dev-audit.controller';
import { DevIdempotencyController } from './modules/dev/dev-idempotency.controller';
import { DevLedgerController } from './modules/dev/dev-ledger.controller';
import { FilesModule } from './modules/files/files.module';
import { HealthController } from './modules/health/health.controller';
import { HealthService } from './modules/health/health.service';
import { HardshipModule } from './modules/hardship/hardship.module';
import { KycModule } from './modules/kyc/kyc.module';
import { IdentityModule } from './modules/identity/identity.module';
import { LoansModule } from './modules/loans/loans.module';
import { MeModule } from './modules/me/me.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PublicModule } from './modules/public/public.module';
import { NotificationsApiModule } from './modules/notifications/notifications.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LoanApplicationsModule } from './modules/loan-applications/loan-applications.module';
import { LoanProductsModule } from './modules/loan-products/loan-products.module';
import { PlatformOnboardingModule } from './modules/platform-onboarding/platform-onboarding.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { SupportModule } from './modules/support/support.module';
import { TenantAdminUsersModule } from './modules/tenant-admin-users/tenant-admin-users.module';
import { TreasuryModule } from './treasury/treasury.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { RiskEngineModule } from './risk/risk.module';
import { AdminConfirmationModule } from './common/admin-confirmation/admin-confirmation.module';

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
    AdminConfirmationModule,
    EventsModule,
    IdempotencyModule,
    LedgerModule,
    LocksModule,
    NotificationsModule,
    FeatureFlagModule,
    MetricsModule,
    RequestContextModule,
    IntegrationsModule,
    RedisModule,
    RiskModule,
    RbacModule,
    JobsModule,
    RiskEngineModule,
    AuthModule,
    AdminAuthModule,
    AdminCollectionsModule,
    AdminConfirmationsModule,
    AdminDashboardModule,
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
    PortfolioModule,
    AdminJobsModule,
    AdminOpsModule,
    AdminDisbursementsModule,
    CaseManagementModule,
    HardshipModule,
    BankAccountsModule,
    MeModule,
    PublicModule,
    TenantsModule,
    LoanApplicationsModule,
    LoanProductsModule,
    PlatformOnboardingModule,
    ReconciliationModule,
    SupportModule,
    TenantAdminUsersModule,
    TreasuryModule,
    FilesModule,
    KycModule,
    IdentityModule,
    LoansModule,
    PaymentsModule,
    NotificationsApiModule,
    WebhooksModule,
    ComplianceModule
  ],
  controllers: [HealthController, DevIdempotencyController, DevAuditController, DevLedgerController],
  providers: [
    HealthService,
    GlobalRateLimitMiddleware,
    RedisRateLimitMiddleware,
    RateLimitPolicyService,
    GlobalExceptionFilter,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLogContextInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    },
    {
      provide: APP_GUARD,
      useClass: ProdDevEndpointsGuard
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RequestContextMiddleware).forRoutes('*');
  }
}
