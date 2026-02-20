import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { IdentityController } from './identity.controller';
import { IdentityRiskService } from './identity-risk.service';
import { IdentityService } from './identity.service';
import { BVN_PROVIDER, NibssBvnProvider } from './providers/bvn.provider';
import { NIN_PROVIDER, StubNinProvider } from './providers/nin.provider';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [IdentityController],
  providers: [
    IdentityService,
    IdentityRiskService,
    NibssBvnProvider,
    StubNinProvider,
    { provide: BVN_PROVIDER, useExisting: NibssBvnProvider },
    { provide: NIN_PROVIDER, useExisting: StubNinProvider }
  ],
  exports: [IdentityService, IdentityRiskService, BVN_PROVIDER, NIN_PROVIDER]
})
export class IdentityModule {}

