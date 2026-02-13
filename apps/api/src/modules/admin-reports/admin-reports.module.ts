import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminReportsController],
  providers: [AdminReportsService],
  exports: [AdminReportsService]
})
export class AdminReportsModule {}
