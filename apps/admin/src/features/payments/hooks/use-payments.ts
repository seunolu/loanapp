'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPayments, fetchRepayments } from '@/src/features/payments/api';

export type PaymentsTab = 'payments' | 'repayments';

export function usePayments(params: {
  tab: PaymentsTab;
  limit: number;
  cursor?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: [
      'payments-page',
      params.tab,
      params.limit,
      params.cursor ?? '',
      params.status ?? '',
      params.from ?? '',
      params.to ?? ''
    ],
    queryFn: () =>
      params.tab === 'payments'
        ? fetchPayments({
            limit: params.limit,
            cursor: params.cursor,
            status: params.status,
            from: params.from,
            to: params.to
          })
        : fetchRepayments({
            limit: params.limit,
            cursor: params.cursor,
            status: params.status,
            from: params.from,
            to: params.to
          }),
    keepPreviousData: true
  });
}
