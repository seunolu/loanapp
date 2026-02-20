export type PortfolioTreasuryPoolExposureDto = {
  poolId: string;
  poolName: string;
  type: string;
  status: string;
  totalCommitted: number;
  totalReserved: number;
  availableLiquidity: number;
};

export type PortfolioTreasuryExposureDto = {
  asOf: string;
  pools: PortfolioTreasuryPoolExposureDto[];
  totals: {
    committed: number;
    reserved: number;
    availableLiquidity: number;
  };
};

