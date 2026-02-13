import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminMeResponseDto } from './dto/admin-me-response.dto';
import { AdminMeService } from './admin-me.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin')
export class AdminMeController {
  constructor(private readonly adminMeService: AdminMeService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current admin identity, lender, and permissions' })
  @ApiOkResponse({ type: AdminMeResponseDto })
  async getMe(@CurrentAdmin() admin: AdminPrincipal): Promise<AdminMeResponseDto> {
    return this.adminMeService.getMe(admin);
  }
}
