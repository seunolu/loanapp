import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { Idempotent } from '../../common/idempotency/idempotency.decorator';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminDisbursementsService } from './admin-disbursements.service';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { CreateDisbursementResponseDto } from './dto/create-disbursement-response.dto';
import { DisbursementStatusResponseDto } from './dto/disbursement-status-response.dto';
import { MarkFailedDisbursementDto } from './dto/mark-failed-disbursement.dto';

@ApiTags('AdminDisbursements')
@ApiBearerAuth('bearer')
@Controller('admin/disbursements')
@UseGuards(AdminAuthGuard, PermissionsGuard)
export class AdminDisbursementsController {
  constructor(private readonly adminDisbursementsService: AdminDisbursementsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('DISBURSEMENTS_MANAGE')
  @ApiOperation({ summary: 'Initiate loan disbursement domain record' })
  @ApiOkResponse({ type: CreateDisbursementResponseDto })
  async create(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() body: CreateDisbursementDto
  ): Promise<CreateDisbursementResponseDto> {
    return this.adminDisbursementsService.create(admin, body);
  }

  @Post(':id/mark-processing')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('DISBURSEMENTS_MANAGE')
  @ApiOperation({ summary: 'Transition disbursement from INITIATED to PROCESSING' })
  @ApiOkResponse({ type: DisbursementStatusResponseDto })
  async markProcessing(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string
  ): Promise<DisbursementStatusResponseDto> {
    return this.adminDisbursementsService.markProcessing(admin, id);
  }

  @Post(':id/mark-succeeded')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('DISBURSEMENTS_MANAGE')
  @Idempotent('DISBURSEMENT_SUCCEED')
  @ApiOperation({ summary: 'Mark disbursement as SUCCEEDED, post ledger, and activate loan' })
  @ApiOkResponse({ type: DisbursementStatusResponseDto })
  async markSucceeded(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string
  ): Promise<DisbursementStatusResponseDto> {
    return this.adminDisbursementsService.markSucceeded(admin, id);
  }

  @Post(':id/mark-failed')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('DISBURSEMENTS_MANAGE')
  @ApiOperation({ summary: 'Mark disbursement as FAILED with reason' })
  @ApiOkResponse({ type: DisbursementStatusResponseDto })
  async markFailed(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: MarkFailedDisbursementDto
  ): Promise<DisbursementStatusResponseDto> {
    return this.adminDisbursementsService.markFailed(admin, id, body);
  }
}
