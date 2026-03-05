import { getSelectedTenantConfig } from '../../lib/api';

export type LoanProductView = {
  id: string;
  name: string;
  currency: string;
  minPrincipal: number;
  maxPrincipal: number;
  minTenorDays: number;
  maxTenorDays: number;
  source: 'api' | 'policy';
};

export async function fetchAvailableLoanProducts(): Promise<LoanProductView[]> {
  const config = await getSelectedTenantConfig();
  return [
    {
      id: `policy-${config.lenderSlug}`,
      name: `${config.branding.displayName} Standard Loan`,
      currency: 'NGN',
      minPrincipal: config.policy.minLoanAmountKobo,
      maxPrincipal: config.policy.maxLoanAmountKobo,
      minTenorDays: config.policy.minTenorDays,
      maxTenorDays: config.policy.maxTenorDays,
      source: 'policy'
    }
  ];
}
