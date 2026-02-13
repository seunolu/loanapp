import { ApiProperty } from '@nestjs/swagger';

export class PenaltyAccrualDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  loanId!: string;

  @ApiProperty({ format: 'date-time' })
  accrualDate!: string;

  @ApiProperty({ example: 1250 })
  amountKobo!: number;

  @ApiProperty({ nullable: true })
  journalEntryId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
