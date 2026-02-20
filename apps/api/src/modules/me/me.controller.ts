import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { AcceptConsentDto } from './dto/accept-consent.dto';
import { ConsentResponseDto } from './dto/consent-response.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MeService } from './me.service';

@ApiTags('Me')
@ApiBearerAuth('bearer')
@Controller('me')
@UseGuards(BorrowerAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Get authenticated borrower summary' })
  @ApiOkResponse({ type: MeResponseDto })
  async getMe(@CurrentBorrower() borrower: BorrowerPrincipal): Promise<MeResponseDto> {
    return this.meService.getMe(borrower);
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update borrower profile' })
  @ApiOkResponse({ type: MeResponseDto })
  async updateProfile(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Body() body: UpdateProfileDto
  ): Promise<MeResponseDto> {
    return this.meService.updateProfile(borrower, body);
  }

  @Post('consents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept borrower consent (idempotent per type+version)' })
  @ApiOkResponse({ type: ConsentResponseDto })
  async acceptConsent(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Body() body: AcceptConsentDto
  ): Promise<ConsentResponseDto> {
    return this.meService.acceptConsent(borrower, body);
  }

  @Get('holds')
  @ApiOperation({ summary: 'Get active borrower hold status' })
  async getHolds(@CurrentBorrower() borrower: BorrowerPrincipal) {
    return this.meService.getHolds(borrower);
  }
}
