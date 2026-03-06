import { Link, router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLoanDetail } from '../../../src/features/loan-history/loanDetail.queries';
import { useLoanHistory } from '../../../src/features/loan-history/loanHistory.queries';
import { formatDate, formatMoneyNGN } from '../../../src/lib/format';
import { listMyMandates } from '../../../src/lib/api';
import { Button, Card, EmptyState, ErrorState, Screen, Skeleton, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

export default function RepayIndexScreen() {
  const historyQuery = useLoanHistory({ limit: 20 });
  const mandatesQuery = useQuery({
    queryKey: ['borrower', 'mandates'],
    queryFn: listMyMandates
  });

  const activeLoan = useMemo(
    () => (historyQuery.data ?? []).find((item) => ['ACTIVE', 'APPROVED', 'DISBURSED'].includes(item.status.toUpperCase())) ?? null,
    [historyQuery.data]
  );
  const loanDetailQuery = useLoanDetail(activeLoan?.id ?? '');
  const activeMandate = useMemo(
    () => (mandatesQuery.data ?? []).find((item) => item.status === 'ACTIVE') ?? null,
    [mandatesQuery.data]
  );

  const hasError = historyQuery.isError || mandatesQuery.isError;
  if (historyQuery.isLoading || mandatesQuery.isLoading) {
    return <RepayLoadingScreen />;
  }

  if (hasError) {
    return (
      <Screen>
        <TopNav title="Repay" subtitle="Stay current and avoid penalties." />
        <ErrorState title="Unable to load repayment overview" message="Please try again in a moment." onRetry={() => {
          void historyQuery.refetch();
          void mandatesQuery.refetch();
        }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopNav title="Repay" subtitle="Stay current and avoid penalties." />
      {activeLoan ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Active loan due</Text>
          <Text style={styles.amount}>{formatMoneyNGN(loanDetailQuery.data?.totalPayableKobo ?? activeLoan.amountKobo, 'kobo')}</Text>
          <Text style={styles.muted}>{loanDetailQuery.data?.dueDate ? `Next due ${formatDate(loanDetailQuery.data.dueDate)}` : 'Due date will appear when the repayment schedule is ready.'}</Text>
        </Card>
      ) : (
        <EmptyState title="No active loan" body="Once you have an active loan, repayment options will show here." />
      )}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Saved payment method</Text>
        <Text style={styles.value}>{activeMandate ? `${activeMandate.provider} mandate` : 'No saved mandate yet'}</Text>
        <Text style={styles.muted}>{activeMandate?.nextDebitAt ? `Next debit ${formatDate(activeMandate.nextDebitAt)}` : 'Choose a payment method to continue.'}</Text>
      </Card>
      <View style={styles.actions}>
        <Link href={{ pathname: '/repay/methods', params: activeLoan?.id ? { loanId: activeLoan.id } : undefined } as never} asChild>
          <Button label="Choose method" variant="secondary" />
        </Link>
        <Button label="Pay now" disabled={!activeLoan?.id} onPress={() => router.push({ pathname: '/repay/pay-now', params: { loanId: activeLoan?.id ?? '', method: 'CARD' } } as never)} />
      </View>
    </Screen>
  );
}

function RepayLoadingScreen() {
  return (
    <Screen>
      <TopNav title="Repay" subtitle="Stay current and avoid penalties." />
      <Card style={styles.card}>
        <Skeleton width="40%" height={18} />
        <Skeleton width="60%" height={36} />
        <Skeleton width="70%" height={14} />
      </Card>
      <Card style={styles.card}>
        <Skeleton width="35%" height={18} />
        <Skeleton width="55%" height={16} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.text
  },
  amount: {
    ...typography.display,
    color: colors.text
  },
  value: {
    ...typography.body,
    color: colors.text
  },
  muted: {
    ...typography.body,
    color: colors.textMuted
  },
  actions: {
    gap: spacing.sm
  }
});
