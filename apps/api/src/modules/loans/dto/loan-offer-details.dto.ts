import { ApiProperty } from '@nestjs/swagger';

export class LoanOfferScheduleItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'date-time' })
  dueDate!: string;

  @ApiProperty()
  amount!: number;
}

export class LoanOfferDetailsDto {
  @ApiProperty()
  offerId!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: ['OFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED'] })
  status!: 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

  @ApiProperty()
  principalAmount!: number;

  @ApiProperty()
  interestAmount!: number;

  @ApiProperty()
  feeAmount!: number;

  @ApiProperty()
  totalRepayable!: number;

  @ApiProperty({ format: 'date-time' })
  offeredAt!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ type: [LoanOfferScheduleItemDto] })
  schedule!: LoanOfferScheduleItemDto[];
}
