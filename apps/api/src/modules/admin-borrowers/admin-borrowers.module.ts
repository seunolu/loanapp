import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminBorrowersController } from './admin-borrowers.controller';
import { AdminBorrowersService } from './admin-borrowers.service';

@Module({
  imports: [AdminAuthModule, AuditModule],
  controllers: [AdminBorrowersController],
  providers: [AdminBorrowersService]
})
export class AdminBorrowersModule {}
