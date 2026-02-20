import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { TenantContextService } from './tenant-context.service';
import { TenantScopedPrismaService } from './tenant-scoped-prisma.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  providers: [TenantContextService, TenantScopedPrismaService],
  exports: [TenantContextService, TenantScopedPrismaService]
})
export class TenantContextModule {}
