import { ApiProperty } from '@nestjs/swagger';

export class AcceptOfferResponseDto {
  @ApiProperty()
  loanId!: string;

  @ApiProperty({ enum: ['PENDING_DISBURSEMENT'] })
  status!: 'PENDING_DISBURSEMENT';
}
