import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminBorrowersService } from './admin-borrowers.service';
import { AddBorrowerNoteDto } from './dto/add-borrower-note.dto';
import {
  AdminBorrowerListResponseDto,
  AdminBorrowerResponseDto
} from './dto/admin-borrower-response.dto';
import { BorrowerNoteResponseDto } from './dto/borrower-note-response.dto';
import { BorrowerOverrideResponseDto } from './dto/borrower-override-response.dto';
import { CreateAdminBorrowerDto } from './dto/create-admin-borrower.dto';
import { ListAdminBorrowersQueryDto } from './dto/list-admin-borrowers-query.dto';
import { SetBorrowerOverrideDto } from './dto/set-borrower-override.dto';
import { BorrowerRiskResponseDto } from './dto/borrower-risk-response.dto';

@ApiTags('AdminBorrowers')
@ApiBearerAuth('bearer')
@Controller('admin/borrowers')
@UseGuards(AdminAuthGuard, PermissionsGuard)
export class AdminBorrowersController {
  constructor(private readonly service: AdminBorrowersService) {}

  @Post()
  @RequirePermissions('BORROWERS_WRITE')
  @ApiOperation({ summary: 'Create borrower with profile under current lender' })
  @ApiOkResponse({ type: AdminBorrowerResponseDto })
  async create(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() body: CreateAdminBorrowerDto
  ): Promise<AdminBorrowerResponseDto> {
    return this.service.createBorrower(admin, body);
  }

  @Get()
  @RequirePermissions('BORROWERS_READ')
  @ApiOperation({ summary: 'List/search borrowers for current lender' })
  @ApiOkResponse({
    type: AdminBorrowerListResponseDto,
    example: {
      items: [
        {
          id: 'cmlx1',
          phone: '+2348012345678',
          firstName: 'Ada',
          lastName: 'Okafor',
          createdAt: '2026-02-12T12:00:00.000Z'
        }
      ],
      nextCursor: 'eyJjcmVhdGVkQXQiOiIyMDI2LTAyLTEyVDEyOjAwOjAwLjAwMFoiLCJpZCI6ImNtbHgxIn0'
    }
  })
  async list(
    @CurrentAdmin() admin: AdminPrincipal,
    @Query() query: ListAdminBorrowersQueryDto
  ): Promise<AdminBorrowerListResponseDto> {
    return this.service.listBorrowers(admin, query);
  }

  @Get(':id')
  @RequirePermissions('BORROWERS_READ')
  @ApiOperation({ summary: 'Get borrower details (lender scoped)' })
  @ApiOkResponse({ type: AdminBorrowerResponseDto })
  async getById(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string
  ): Promise<AdminBorrowerResponseDto> {
    return this.service.getBorrower(admin, id);
  }

  @Get(':id/risk')
  @RequirePermissions('RISK_VIEW')
  @ApiOperation({ summary: 'Get borrower risk profile and recent risk events' })
  @ApiOkResponse({ type: BorrowerRiskResponseDto })
  async getRisk(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string
  ): Promise<BorrowerRiskResponseDto> {
    return this.service.getBorrowerRisk(admin, id);
  }

  @Post(':id/notes')
  @RequirePermissions('BORROWERS_WRITE')
  @ApiOperation({ summary: 'Add internal note to borrower' })
  @ApiOkResponse({ type: BorrowerNoteResponseDto })
  async addNote(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: AddBorrowerNoteDto
  ): Promise<BorrowerNoteResponseDto> {
    return this.service.addNote(admin, id, body);
  }

  @Put(':id/override')
  @RequirePermissions('BORROWERS_WRITE')
  @ApiOperation({ summary: 'Set borrower loan policy override' })
  @ApiOkResponse({ type: BorrowerOverrideResponseDto })
  async setOverride(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: SetBorrowerOverrideDto
  ): Promise<BorrowerOverrideResponseDto> {
    return this.service.setOverride(admin, id, body);
  }
}
