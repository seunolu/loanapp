import { BadRequestException, Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';
import { resolveLoanApplicationHoldSchema } from './dto/resolve-loan-application-hold.dto';

@ApiTags('Admin Risk Holds')
@ApiBearerAuth('bearer')
@Controller('admin/holds')
@UseGuards(TenantAdminAuthGuard)
export class AdminRiskHoldsController {
  constructor(private readonly adminLoanApplicationsService: AdminLoanApplicationsService) {}

  @Post(':holdId/resolve')
  @ApiOperation({ summary: 'Resolve a risk hold by holdId' })
  @ApiOkResponse()
  resolveHold(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('holdId') holdId: string,
    @Body() body: unknown
  ) {
    const parsed = resolveLoanApplicationHoldSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid hold resolution payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.resolveHold(admin, holdId, parsed.data);
  }
}

