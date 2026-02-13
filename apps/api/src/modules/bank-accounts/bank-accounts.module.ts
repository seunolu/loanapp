import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [BankAccountsController],
  providers: [BankAccountsService]
})
export class BankAccountsModule {}
