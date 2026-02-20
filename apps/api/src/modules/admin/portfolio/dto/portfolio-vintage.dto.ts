export type PortfolioVintageRowDto = {
  cohortMonth: string;
  disbursedCount: number;
  disbursedAmount: number;
  delinquent30Amount: number;
  delinquent90Amount: number;
};

export type PortfolioVintageResponseDto = {
  months: number;
  items: PortfolioVintageRowDto[];
};

