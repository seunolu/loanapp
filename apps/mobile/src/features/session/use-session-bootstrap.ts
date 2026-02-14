import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getMe, hasActiveSession, type BorrowerMe } from '../../lib/api';

export const SESSION_ME_QUERY_KEY = ['session', 'me'] as const;

export function useSessionBootstrap() {
  return useQuery({
    queryKey: SESSION_ME_QUERY_KEY,
    queryFn: () => getMe(),
    retry: false
  });
}

export function useHasSession() {
  return useQuery({
    queryKey: ['session', 'exists'],
    queryFn: () => hasActiveSession(),
    staleTime: 5_000
  });
}

export function useSetSessionMe() {
  const queryClient = useQueryClient();
  return (me: BorrowerMe) => {
    queryClient.setQueryData(SESSION_ME_QUERY_KEY, me);
    queryClient.setQueryData(['session', 'exists'], true);
  };
}
