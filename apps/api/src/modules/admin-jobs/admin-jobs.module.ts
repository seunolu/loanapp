import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { JobsModule } from '../../common/jobs/jobs.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminJobsService } from './admin-jobs.service';

@Module({
  imports: [AdminAuthModule, JobsModule, AuditModule],
  controllers: [AdminJobsController],
  providers: [AdminJobsService]
})
export class AdminJobsModule {}
