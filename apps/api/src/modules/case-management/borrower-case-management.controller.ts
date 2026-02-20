import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import {
  createBorrowerCaseMessageSchema,
  createBorrowerCaseSchema,
  listBorrowerCasesQuerySchema
} from './dto/case-management.dto';
import { CaseManagementService } from './case-management.service';

@ApiTags('Borrower Cases')
@ApiBearerAuth('bearer')
@Controller('cases')
@UseGuards(BorrowerAuthGuard)
export class BorrowerCaseManagementController {
  constructor(private readonly caseService: CaseManagementService) {}

  @Post()
  @ApiOperation({ summary: 'Create borrower support case' })
  async createCase(@CurrentBorrower() borrower: BorrowerPrincipal, @Body() body: unknown) {
    const parsed = createBorrowerCaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid create borrower case payload.',
        details: parsed.error.flatten()
      });
    }
    return this.caseService.createBorrowerCase(borrower, parsed.data);
  }

  @Get()
  @ApiOperation({ summary: 'List borrower cases (internal notes excluded)' })
  async list(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Query() query: Record<string, string | undefined>
  ) {
    const parsed = listBorrowerCasesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid list borrower cases query.',
        details: parsed.error.flatten()
      });
    }
    return this.caseService.listBorrowerCases(borrower, parsed.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get borrower case details (internal notes excluded)' })
  async getCase(@CurrentBorrower() borrower: BorrowerPrincipal, @Param('id') id: string) {
    return this.caseService.getBorrowerCase(borrower, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Post borrower-visible message on a case' })
  async addMessage(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = createBorrowerCaseMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid borrower case message payload.',
        details: parsed.error.flatten()
      });
    }
    return this.caseService.addBorrowerMessage(borrower, id, parsed.data);
  }
}
