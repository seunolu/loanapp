import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../common/audit/audit.service';

class AuditDemoDto {
  @IsString()
  @IsOptional()
  note?: string;
}

@ApiTags('Dev')
@Controller('dev')
export class DevAuditController {
  constructor(private readonly auditService: AuditService) {}

  // Dev-only endpoint used to verify immutable audit logging.
  @Post('audit-demo')
  async writeAudit(@Body() body: AuditDemoDto): Promise<{ ok: true }> {
    await this.auditService.write({
      event: 'dev.audit_demo',
      metadata: {
        note: body.note ?? null
      }
    });

    return { ok: true };
  }
}
