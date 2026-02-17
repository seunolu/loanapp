import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminLoanApplicationsController } from './admin-loan-applications.controller';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminLoanApplicationsController],
  providers: [AdminLoanApplicationsService]
})
export class AdminLoanApplicationsModule {}

