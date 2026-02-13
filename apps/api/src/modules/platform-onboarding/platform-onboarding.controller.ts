import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { Idempotent } from '../../common/idempotency/idempotency.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { PlatformOnboardingService } from './platform-onboarding.service';
import { CreatePlatformLenderDto } from './dto/create-platform-lender.dto';
import { PlatformOnboardLenderResponseDto } from './dto/platform-onboard-lender-response.dto';
import { PlatformLenderDetailsResponseDto } from './dto/platform-lender-details-response.dto';

@ApiTags('PlatformOnboarding')
@ApiBearerAuth('bearer')
@Controller('platform/onboarding')
@UseGuards(AdminAuthGuard)
export class PlatformOnboardingController {
  constructor(private readonly service: PlatformOnboardingService) {}

  @Post('lenders')
  @Idempotent('ONBOARD_LENDER')
  @ApiOperation({ summary: 'Onboard lender and create first owner admin (platform only)' })
  @ApiOkResponse({ type: PlatformOnboardLenderResponseDto })
  async onboard(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() body: CreatePlatformLenderDto
  ): Promise<PlatformOnboardLenderResponseDto> {
    return this.service.onboardLender(admin, body);
  }

  @Get('lenders/:id')
  @ApiOperation({ summary: 'Get lender onboarding status and owner summary (platform only)' })
  @ApiOkResponse({ type: PlatformLenderDetailsResponseDto })
  async getLender(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string
  ): Promise<PlatformLenderDetailsResponseDto> {
    return this.service.getLender(admin, id);
  }
}

