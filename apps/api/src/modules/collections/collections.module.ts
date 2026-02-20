import { Module } from '@nestjs/common';
import { DelinquencyService } from './delinquency.service';
import { PenaltyService } from './penalty.service';
import { CollectionsCronService } from './collections.cron';
import { CollectionsScanService } from './collections-scan.service';

@Module({
  providers: [DelinquencyService, PenaltyService, CollectionsScanService, CollectionsCronService],
  exports: [DelinquencyService, PenaltyService, CollectionsScanService]
})
export class CollectionsModule {}
