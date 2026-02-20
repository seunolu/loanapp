import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { Env } from '../common/config/env.schema';
import { validateEnv } from '../common/config/validate-env';
import { DatabaseModule } from '../common/database/database.module';
import { FinancialInvariantsService } from '../common/finance/financial-invariants.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { JobQueueModule } from '../common/jobs/job-queue.module';
import { buildPinoHttpConfig } from '../common/logger/pino-http.config';
import { MetricsModule } from '../common/observability/metrics.module';
import { FraudRulesService } from '../modules/fraud/fraud-rules.service';
import { FraudScoringService } from '../modules/fraud/fraud-scoring.service';
import { FraudWorkerProcessor } from '../modules/fraud/fraud-worker.processor';
import { PortfolioService } from '../modules/admin/portfolio/portfolio.service';
import { TreasuryModule } from '../treasury/treasury.module';
import { RetentionPolicyService } from '../modules/compliance/retention-policy.service';
import { PaymentsModule } from '../modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        pinoHttp: buildPinoHttpConfig(configService)
      })
    }),
    DatabaseModule,
    MetricsModule,
    JobQueueModule,
    IntegrationsModule,
    PaymentsModule,
    TreasuryModule
  ],
  providers: [FinancialInvariantsService, FraudScoringService, FraudRulesService, FraudWorkerProcessor, PortfolioService, RetentionPolicyService]
})
export class WorkerModule {}
