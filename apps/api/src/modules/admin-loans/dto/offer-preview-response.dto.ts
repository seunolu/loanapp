import { ApiProperty } from '@nestjs/swagger';

class OfferPreviewScheduleItemDto {
  @ApiProperty()
  dueDate!: string;

  @ApiProperty()
  amount!: number;
}

class OfferPreviewPricingSnapshotDto {
  @ApiProperty()
  interestRateBpsMonthly!: number;

  @ApiProperty()
  originationFeeKoboFlat!: number;

  @ApiProperty()
  originationFeeBps!: number;

  @ApiProperty({ enum: ['BULLET', 'WEEKLY_EQUAL', 'MONTHLY_EQUAL'] })
  scheduleType!: 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL';

  @ApiProperty()
  offerExpiryHours!: number;
}

export class OfferPreviewResponseDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  principalAmount!: number;

  @ApiProperty()
  interestAmount!: number;

  @ApiProperty()
  feeAmount!: number;

  @ApiProperty()
  totalRepayable!: number;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ enum: ['BULLET', 'WEEKLY_EQUAL', 'MONTHLY_EQUAL'] })
  scheduleType!: 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL';

  @ApiProperty({ type: [OfferPreviewScheduleItemDto] })
  schedule!: OfferPreviewScheduleItemDto[];

  @ApiProperty({ type: OfferPreviewPricingSnapshotDto })
  pricingSnapshot!: OfferPreviewPricingSnapshotDto;
}
