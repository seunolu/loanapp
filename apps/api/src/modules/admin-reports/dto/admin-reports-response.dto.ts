import { ApiProperty } from '@nestjs/swagger';

export class SummaryReportDto {
  @ApiProperty()
  asOf!: string;

  @ApiProperty()
  totalBorrowers!: number;

  @ApiProperty()
  activeLoans!: number;

  @ApiProperty()
  overdueLoans!: number;

  @ApiProperty()
  pendingDisbursementLoans!: number;

  @ApiProperty()
  outstandingPrincipalKobo!: number;

  @ApiProperty()
  outstandingTotalKobo!: number;

  @ApiProperty()
  disbursedTotalKobo!: number;

  @ApiProperty()
  collectedTotalKobo!: number;
}

export class PortfolioReportDto {
  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty()
  submittedApplicationsCount!: number;

  @ApiProperty()
  submittedApplicationsAmountKobo!: number;

  @ApiProperty()
  approvedApplicationsCount!: number;

  @ApiProperty()
  rejectedApplicationsCount!: number;

  @ApiProperty()
  offersCount!: number;

  @ApiProperty()
  offeredPrincipalKobo!: number;

  @ApiProperty()
  disbursementsSucceededCount!: number;

  @ApiProperty()
  disbursementsSucceededAmountKobo!: number;
}

export class DailyCollectionBucketDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  amountKobo!: number;

  @ApiProperty()
  count!: number;
}

export class CollectionsReportDto {
  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty()
  totalCollectedKobo!: number;

  @ApiProperty()
  paymentsCount!: number;

  @ApiProperty({ type: [DailyCollectionBucketDto] })
  dailyBuckets!: DailyCollectionBucketDto[];
}

export class ParReportDto {
  @ApiProperty()
  asOf!: string;

  @ApiProperty()
  portfolioOutstandingKobo!: number;

  @ApiProperty()
  par1AmountKobo!: number;

  @ApiProperty()
  par1Rate!: number;

  @ApiProperty()
  par7AmountKobo!: number;

  @ApiProperty()
  par7Rate!: number;

  @ApiProperty()
  par30AmountKobo!: number;

  @ApiProperty()
  par30Rate!: number;
}
