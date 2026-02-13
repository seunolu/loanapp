import { ApiProperty } from '@nestjs/swagger';

export class DisbursementStatusResponseDto {
  @ApiProperty()
  disbursementId!: string;

  @ApiProperty()
  loanId!: string;

  @ApiProperty({ enum: ['INITIATED', 'PROCESSING', 'SUCCEEDED', 'FAILED'] })
  status!: 'INITIATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

  @ApiProperty({ nullable: true })
  journalEntryId!: string | null;
}
