import { Module } from '@nestjs/common';
import { LoanApplicationsController } from './loan-applications.controller';
import { LoanApplicationsService } from './loan-applications.service';

@Module({
  controllers: [LoanApplicationsController],
  providers: [LoanApplicationsService]
})
export class LoanApplicationsModule {}

