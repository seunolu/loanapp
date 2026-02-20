import { Module } from '@nestjs/common';
import { AuditModule } from '../common/audit/audit.module';
import { DatabaseModule } from '../common/database/database.module';
import { RequestContextModule } from '../common/request-context/request-context.module';
import { MetricsModule } from '../common/observability/metrics.module';
import { AdminAuthModule } from '../modules/admin-auth/admin-auth.module';
import { AdminRiskController } from './admin-risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [DatabaseModule, AuditModule, AdminAuthModule, RequestContextModule, MetricsModule],
  controllers: [AdminRiskController],
  providers: [RiskService],
  exports: [RiskService]
})
export class RiskEngineModule {}
