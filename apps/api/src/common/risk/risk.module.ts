import { Global, Module } from '@nestjs/common';
import { RequestContextModule } from '../request-context/request-context.module';
import { RiskService } from './risk.service';

@Global()
@Module({
  imports: [RequestContextModule],
  providers: [RiskService],
  exports: [RiskService]
})
export class RiskModule {}
