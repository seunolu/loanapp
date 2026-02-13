import { Module } from '@nestjs/common';
import { RbacModule } from '../../common/rbac/rbac.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminMeController } from './admin-me.controller';
import { AdminMeService } from './admin-me.service';

@Module({
  imports: [AdminAuthModule, RbacModule],
  controllers: [AdminMeController],
  providers: [AdminMeService]
})
export class AdminMeModule {}
