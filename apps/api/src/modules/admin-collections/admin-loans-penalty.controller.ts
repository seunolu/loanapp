import { BadRequestException, Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { AdminCollectionsService } from './admin-collections.service';
import { pauseLoanPenaltySchema } from './dto/pause-loan-penalty.dto';
import { waiveLoanPenaltySchema } from './dto/waive-loan-penalty.dto';

@ApiTags('Admin Collections')
@ApiBearerAuth('bearer')
@Controller('admin/loans')
@UseGuards(TenantAdminAuthGuard)
export class AdminLoansPenaltyController {
  constructor(private readonly service: AdminCollectionsService) {}

  @Post(':loanAccountId/penalty/pause')
  @ApiOperation({ summary: 'Pause/resume penalties for loan account' })
  @ApiOkResponse()
  pauseLoanPenalty(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('loanAccountId') loanAccountId: string,
    @Body() body: unknown
  ) {
    const parsed = pauseLoanPenaltySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid penalty pause payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.pauseLoanPenalty(admin, loanAccountId, parsed.data);
  }

  @Post(':loanAccountId/penalty/waive')
  @ApiOperation({ summary: 'Waive part of penalties for loan account' })
  @ApiOkResponse()
  waiveLoanPenalty(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('loanAccountId') loanAccountId: string,
    @Body() body: unknown
  ) {
    const parsed = waiveLoanPenaltySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid penalty waiver payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.waiveLoanPenalty(admin, loanAccountId, parsed.data);
  }
}

