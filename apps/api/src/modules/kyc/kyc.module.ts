import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [KycController],
  providers: [KycService]
})
export class KycModule {}
