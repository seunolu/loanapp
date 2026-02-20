import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { DatabaseModule } from '../../common/database/database.module';
import { NotificationsModule } from '../../common/notifications/notifications.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminFraudController } from './admin-fraud.controller';
import { FraudEvaluatorService } from './fraud-evaluator.service';
import { FraudRulesService } from './fraud-rules.service';
import { FraudScoringService } from './fraud-scoring.service';
import { FraudWorkerProcessor } from './fraud-worker.processor';
import { HoldEnforcementService } from './hold-enforcement.service';
import { RiskEventService } from './risk-event.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, AdminAuthModule, AuditModule],
  controllers: [AdminFraudController],
  providers: [
    FraudEvaluatorService,
    RiskEventService,
    FraudScoringService,
    FraudRulesService,
    HoldEnforcementService,
    FraudWorkerProcessor
  ],
  exports: [
    FraudEvaluatorService,
    RiskEventService,
    FraudScoringService,
    FraudRulesService,
    HoldEnforcementService,
    FraudWorkerProcessor
  ]
})
export class FraudModule {}
