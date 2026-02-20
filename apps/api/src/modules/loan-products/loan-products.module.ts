import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { LoanProductsController } from './loan-products.controller';
import { LoanProductsService } from './loan-products.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [LoanProductsController],
  providers: [LoanProductsService]
})
export class LoanProductsModule {}
