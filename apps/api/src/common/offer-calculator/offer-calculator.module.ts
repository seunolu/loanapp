import { Module } from '@nestjs/common';
import { OfferCalculatorService } from './offer-calculator.service';

@Module({
  providers: [OfferCalculatorService],
  exports: [OfferCalculatorService]
})
export class OfferCalculatorModule {}

