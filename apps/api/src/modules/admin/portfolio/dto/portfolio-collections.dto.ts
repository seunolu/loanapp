export type PortfolioCollectionsSeriesRowDto = {
  date: string;
  dueAmount: number;
  collectedAmount: number;
  collectionRate: number;
};

export type PortfolioCollectionsSeriesDto = {
  days: number;
  items: PortfolioCollectionsSeriesRowDto[];
};

