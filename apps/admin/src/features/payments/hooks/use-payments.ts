'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchPayments,
  fetchRepayments,
  type CursorResponse,
  type PaymentListItem,
  type RepaymentListItem
} from '@/src/features/payments/api';

export type PaymentsTab = 'payments' | 'repayments';

export function usePayments(params: {
  tab: PaymentsTab;
  limit: number;
  cursor?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  return useQuery<CursorResponse<PaymentListItem | RepaymentListItem>>({
    queryKey: [
      'payments-page',
      params.tab,
      params.limit,
      params.cursor ?? '',
      params.status ?? '',
      params.from ?? '',
      params.to ?? ''
    ],
    queryFn: async () =>
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
    placeholderData: (previousData) => previousData
  });
}
