import { useQuery } from '@tanstack/react-query';
import { getIdentityStatus, getMe, getSelectedTenantConfig, listMyMandates, listRecentLoans } from '../../lib/api';

export const homeKeys = {
  me: ['me'] as const,
  credit: ['credit'] as const,
  recentLoans: (limit: number) => ['loans', 'recent', limit] as const
};

export function useMeQuery() {
  return useQuery({
    queryKey: homeKeys.me,
    queryFn: getMe
  });
}

export function useRecentLoansQuery(limit = 3) {
  return useQuery({
    queryKey: homeKeys.recentLoans(limit),
    queryFn: () => listRecentLoans(limit)
  });
}

export function useCreditQuery() {
  return useQuery({
    queryKey: homeKeys.credit,
    queryFn: async () => {
      try {
        const config = await getSelectedTenantConfig();
        return {
          availableCreditKobo: config.policy.maxLoanAmountKobo ?? 0,
          sourceLabel: 'Up to'
        };
      } catch {
        return {
          availableCreditKobo: 0,
          sourceLabel: null as string | null
        };
      }
    }
  });
}

export function useHomeKycSignals(enabled: boolean) {
  const identityQuery = useQuery({
    queryKey: ['identity', 'status'],
    queryFn: getIdentityStatus,
    enabled
  });

  const mandatesQuery = useQuery({
    queryKey: ['borrower', 'mandates'],
    queryFn: listMyMandates,
    enabled
  });

  return { identityQuery, mandatesQuery };
}

