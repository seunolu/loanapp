export type PortfolioParBucketDto = {
  bucket: 'PAR_1_7' | 'PAR_8_30' | 'PAR_31_60' | 'PAR_61_90' | 'PAR_90_PLUS';
  count: number;
  outstandingAmount: number;
};

export type PortfolioParResponseDto = {
  asOf: string;
  buckets: PortfolioParBucketDto[];
  par30: number;
  par90: number;
};

