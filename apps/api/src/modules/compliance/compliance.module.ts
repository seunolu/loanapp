import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { ComplianceController } from './compliance.controller';
import { ForensicReportController } from './forensic-report.controller';
import { ForensicReportService } from './forensic-report.service';
import { RegulatoryExportsController } from './regulatory-exports.controller';
import { RegulatoryExportsService } from './regulatory-exports.service';
import { RetentionPolicyService } from './retention-policy.service';
import { SuspiciousActivityService } from './suspicious-activity.service';

@Module({
  imports: [DatabaseModule, AdminAuthModule],
  controllers: [ComplianceController, ForensicReportController, RegulatoryExportsController],
  providers: [ForensicReportService, RegulatoryExportsService, RetentionPolicyService, SuspiciousActivityService],
  exports: [RetentionPolicyService, SuspiciousActivityService, ForensicReportService]
})
export class ComplianceModule {}
