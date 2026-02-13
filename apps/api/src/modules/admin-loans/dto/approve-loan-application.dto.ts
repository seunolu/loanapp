import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OfferPricingOverrideDto } from './offer-pricing-override.dto';

export class ApproveLoanApplicationDto {
  @ApiPropertyOptional({ type: OfferPricingOverrideDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OfferPricingOverrideDto)
  pricingOverride?: OfferPricingOverrideDto;
}

