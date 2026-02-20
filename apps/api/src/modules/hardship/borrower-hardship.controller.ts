import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { createHardshipRequestSchema, listBorrowerHardshipQuerySchema } from './dto/hardship.dto';
import { HardshipService } from './hardship.service';

@ApiTags('Borrower Hardship')
@ApiBearerAuth('bearer')
@Controller('hardship')
@UseGuards(BorrowerAuthGuard)
export class BorrowerHardshipController {
  constructor(private readonly hardshipService: HardshipService) {}

  @Post()
  @ApiOperation({ summary: 'Create borrower hardship request' })
  async create(@CurrentBorrower() borrower: BorrowerPrincipal, @Body() body: unknown) {
    const parsed = createHardshipRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid hardship request payload.',
        details: parsed.error.flatten()
      });
    }
    return this.hardshipService.createBorrowerRequest(borrower, parsed.data);
  }

  @Get()
  @ApiOperation({ summary: 'List borrower hardship requests' })
  async list(@CurrentBorrower() borrower: BorrowerPrincipal, @Query() query: Record<string, string | undefined>) {
    const parsed = listBorrowerHardshipQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid hardship list query.',
        details: parsed.error.flatten()
      });
    }
    return this.hardshipService.listBorrowerRequests(borrower, parsed.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get borrower hardship request detail' })
  async detail(@CurrentBorrower() borrower: BorrowerPrincipal, @Param('id') id: string) {
    return this.hardshipService.getBorrowerRequest(borrower, id);
  }
}

