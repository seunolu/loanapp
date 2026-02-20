import { Module } from '@nestjs/common';
import { AdminConfirmationModule } from '../../common/admin-confirmation/admin-confirmation.module';
import { AdminConfirmationsController } from './admin-confirmations.controller';

@Module({
  imports: [AdminConfirmationModule],
  controllers: [AdminConfirmationsController]
})
export class AdminConfirmationsModule {}

