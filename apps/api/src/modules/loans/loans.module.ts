import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { AuthModule } from '../auth/auth.module';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { OverdueService } from './overdue.service';

@Module({
  imports: [AuthModule, AuditModule, IdempotencyModule],
  controllers: [LoansController],
  providers: [LoansService, OverdueService],
  exports: [OverdueService]
})
export class LoansModule {}
