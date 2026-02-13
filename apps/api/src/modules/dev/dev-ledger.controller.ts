import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { LedgerService } from '../../common/ledger/ledger.service';

class LedgerDemoLineDto {
  @IsString()
  accountCode!: string;

  @IsIn(['DEBIT', 'CREDIT'])
  entryType!: 'DEBIT' | 'CREDIT';

  @IsInt()
  @Min(1)
  amountKobo!: number;

  @IsString()
  @IsOptional()
  description?: string;
}

class LedgerDemoDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => LedgerDemoLineDto)
  lines!: LedgerDemoLineDto[];
}

@ApiTags('Dev')
@Controller('dev')
export class DevLedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  // Dev-only endpoint for manual ledger posting verification.
  @Post('ledger-demo')
  @ApiOperation({ summary: 'Post a demo journal entry (dev only)' })
  @ApiOkResponse()
  async postDemo(@Body() body: LedgerDemoDto) {
    return this.ledgerService.postJournalEntry({
      description: body.description,
      reference: body.reference,
      lines: body.lines
    });
  }
}
