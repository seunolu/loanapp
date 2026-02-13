import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TenantContextService } from './tenant-context.service';

@Module({
  imports: [DatabaseModule],
  providers: [TenantContextService],
  exports: [TenantContextService]
})
export class TenantContextModule {}

