import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { recordConsentSchema, verifyBvnSchema } from './dto/identity.dto';
import { IdentityService } from './identity.service';

@ApiTags('Identity')
@ApiBearerAuth('bearer')
@Controller('identity')
@UseGuards(BorrowerAuthGuard)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record borrower identity consent' })
  async consent(@CurrentBorrower() borrower: BorrowerPrincipal, @Body() body: unknown) {
    const parsed = recordConsentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid consent payload.',
        details: parsed.error.flatten()
      });
    }
    return this.identityService.recordConsent(borrower, parsed.data);
  }

  @Post('verify-bvn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify BVN for authenticated borrower' })
  async verifyBvn(@CurrentBorrower() borrower: BorrowerPrincipal, @Body() body: unknown) {
    const parsed = verifyBvnSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid BVN payload.',
        details: parsed.error.flatten()
      });
    }
    return this.identityService.verifyBvn(borrower, parsed.data);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get latest identity verification status for authenticated borrower' })
  async status(@CurrentBorrower() borrower: BorrowerPrincipal) {
    return this.identityService.getStatus(borrower);
  }
}

