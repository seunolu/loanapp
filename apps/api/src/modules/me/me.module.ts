import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { RequestContextModule } from '../../common/request-context/request-context.module';
import { AuthModule } from '../auth/auth.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [AuthModule, AuditModule, RequestContextModule],
  controllers: [MeController],
  providers: [MeService]
})
export class MeModule {}
