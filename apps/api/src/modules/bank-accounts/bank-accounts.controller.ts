import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { BankAccountsService } from './bank-accounts.service';
import { BankAccountDto } from './dto/bank-account.dto';
import { UpsertBankAccountDto } from './dto/upsert-bank-account.dto';

@ApiTags('Me')
@ApiBearerAuth('bearer')
@Controller('me/bank-accounts')
@UseGuards(BorrowerAuthGuard)
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or upsert borrower bank account' })
  @ApiOkResponse({ type: BankAccountDto })
  async upsert(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Body() body: UpsertBankAccountDto
  ): Promise<BankAccountDto> {
    return this.bankAccountsService.upsert(borrower, body);
  }

  @Get()
  @ApiOperation({ summary: 'List borrower bank accounts' })
  @ApiOkResponse({ type: [BankAccountDto] })
  async list(@CurrentBorrower() borrower: BorrowerPrincipal): Promise<BankAccountDto[]> {
    return this.bankAccountsService.list(borrower);
  }
}
