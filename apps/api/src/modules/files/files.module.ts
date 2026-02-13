import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { RequestContextModule } from '../../common/request-context/request-context.module';
import { AuthModule } from '../auth/auth.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [AuthModule, AuditModule, RequestContextModule],
  controllers: [FilesController],
  providers: [FilesService]
})
export class FilesModule {}
