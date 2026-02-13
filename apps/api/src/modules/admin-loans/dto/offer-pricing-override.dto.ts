import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class OfferPricingOverrideDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  interestRateBpsMonthly?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  originationFeeKoboFlat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  originationFeeBps?: number;

  @ApiPropertyOptional({ enum: ['BULLET', 'WEEKLY_EQUAL', 'MONTHLY_EQUAL'] })
  @IsOptional()
  @IsIn(['BULLET', 'WEEKLY_EQUAL', 'MONTHLY_EQUAL'])
  scheduleType?: 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  offerExpiryHours?: number;
}
