import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiHeader, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { AdminAuthResponseDto } from './dto/admin-auth-response.dto';
import { AdminInviteValidateResponseDto } from './dto/admin-invite-validate-response.dto';
import { AdminInviteValidateDto } from './dto/admin-invite-validate.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRefreshDto } from './dto/admin-refresh.dto';
import { AdminSetupPasswordResponseDto } from './dto/admin-setup-password-response.dto';
import { AdminSetupPasswordDto } from './dto/admin-setup-password.dto';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @RateLimit('AUTH')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login with email and password' })
  @ApiHeader({ name: 'X-Lender-Id', required: false, description: 'Tenant lender ID for tenant admin login' })
  @ApiOkResponse({ type: AdminAuthResponseDto })
  async login(@Body() body: AdminLoginDto): Promise<AdminAuthResponseDto> {
    return this.adminAuthService.login(body);
  }

  @Post('refresh')
  @RateLimit('AUTH')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate admin refresh token' })
  @ApiHeader({
    name: 'Authorization',
    required: false,
    description: 'Bearer <refresh_token>. Optional alternative to request body refreshToken.'
  })
  @ApiOkResponse({ type: AdminAuthResponseDto })
  async refresh(
    @Body() body: AdminRefreshDto,
    @Headers('authorization') authorization?: string
  ): Promise<AdminAuthResponseDto> {
    return this.adminAuthService.refresh(body, authorization);
  }

  @Post('logout')
  @RateLimit('AUTH')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke admin session' })
  @ApiHeader({
    name: 'Authorization',
    required: false,
    description: 'Bearer <refresh_token>. Optional alternative to request body refreshToken.'
  })
  @ApiNoContentResponse()
  async logout(@Body() body: AdminRefreshDto, @Headers('authorization') authorization?: string): Promise<void> {
    await this.adminAuthService.logout(body, authorization);
  }

  @Post('invite/validate')
  @RateLimit('AUTH')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate admin invite token' })
  @ApiOkResponse({ type: AdminInviteValidateResponseDto })
  async validateInvite(@Body() body: AdminInviteValidateDto): Promise<AdminInviteValidateResponseDto> {
    return this.adminAuthService.validateInvite(body);
  }

  @Post('setup-password')
  @RateLimit('AUTH')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set admin password using invite token' })
  @ApiOkResponse({ type: AdminSetupPasswordResponseDto })
  async setupPassword(@Body() body: AdminSetupPasswordDto): Promise<AdminSetupPasswordResponseDto> {
    return this.adminAuthService.setupPassword(body);
  }
}
