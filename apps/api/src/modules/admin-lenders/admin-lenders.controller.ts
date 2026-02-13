import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminLendersService } from './admin-lenders.service';
import { CreateLenderDto } from './dto/create-lender.dto';
import { LenderResponseDto } from './dto/lender-response.dto';
import { UpdateLenderSettingsDto } from './dto/update-lender-settings.dto';

@ApiTags('AdminLenders')
@ApiBearerAuth('bearer')
@Controller('admin/lenders')
@UseGuards(AdminAuthGuard, RolesGuard)
export class AdminLendersController {
  constructor(private readonly service: AdminLendersService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a lender organization (platform super admin)' })
  @ApiOkResponse({ type: LenderResponseDto })
  async create(@Body() body: CreateLenderDto): Promise<LenderResponseDto> {
    return this.service.createLender(body);
  }

  @Get('me')
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER')
  @ApiOperation({ summary: 'Get current admin lender organization' })
  @ApiOkResponse({ type: LenderResponseDto })
  async getMe(@CurrentAdmin() admin: AdminPrincipal): Promise<LenderResponseDto> {
    return this.service.getMyLender(admin);
  }

  @Patch('me')
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE')
  @ApiOperation({ summary: 'Update current lender settings' })
  @ApiOkResponse({ type: LenderResponseDto })
  async patchMe(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() body: UpdateLenderSettingsDto
  ): Promise<LenderResponseDto> {
    return this.service.updateMyLenderSettings(admin, body);
  }
}

