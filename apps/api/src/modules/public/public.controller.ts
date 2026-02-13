import { Controller, Get, Header, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PublicConfigResponseDto } from './dto/public-config-response.dto';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('config')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Get tenant public branding and policy configuration' })
  @ApiHeader({ name: 'X-Lender-Id', required: true, description: 'Tenant lender ID' })
  @ApiOkResponse({
    type: PublicConfigResponseDto,
    description: 'Public tenant config',
    example: {
      lenderId: 'lender_default',
      lenderSlug: 'default',
      branding: {
        displayName: 'LoanApp',
        logoUrl: null,
        primaryColor: '#0f766e'
      },
      policy: {
        minLoanAmountKobo: 500000,
        maxLoanAmountKobo: 10000000,
        minTenorDays: 7,
        maxTenorDays: 60
      },
      support: {
        phone: '+2340000000000',
        email: 'support@loanapp.local',
        whatsapp: null
      },
      features: {
        maintenanceMode: false,
        enableOtpSms: true
      }
    }
  })
  async getConfig(@Res({ passthrough: true }) res: Response): Promise<PublicConfigResponseDto> {
    const result = await this.publicService.getPublicConfig();
    res.setHeader('ETag', result.etag);
    return result.config;
  }
}

