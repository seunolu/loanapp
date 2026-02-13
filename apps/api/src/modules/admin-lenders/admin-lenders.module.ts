import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminLendersController } from './admin-lenders.controller';
import { AdminLendersService } from './admin-lenders.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminLendersController],
  providers: [AdminLendersService]
})
export class AdminLendersModule {}

