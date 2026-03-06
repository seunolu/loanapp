import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLoanHistory } from '../../../src/features/loan-history/loanHistory.queries';
import { Button, Card, EmptyState, Pressable, Screen, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

type RepayMethod = 'MANDATE' | 'CARD' | 'BANK_TRANSFER';

const METHODS: { value: RepayMethod; title: string; body: string; available: boolean }[] = [
  {
    value: 'MANDATE',
    title: 'Mandate',
    body: 'Use or set up an automatic debit mandate for smoother repayments.',
    available: true
  },
  {
    value: 'CARD',
    title: 'Card',
    body: 'Pay securely through the existing payment gateway flow.',
    available: true
  },
  {
    value: 'BANK_TRANSFER',
    title: 'Bank transfer',
    body: 'Placeholder flow for manual transfers. Keep this for operations coordination.',
    available: true
  }
];

export default function RepayMethodsScreen() {
  const params = useLocalSearchParams<{ loanId?: string | string[] }>();
  const historyQuery = useLoanHistory({ limit: 20 });
  const paramLoanId = useMemo(() => {
    const value = params.loanId;
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
  }, [params.loanId]);
  const activeLoanId = historyQuery.data?.find((item) => ['ACTIVE', 'APPROVED', 'DISBURSED'].includes(item.status.toUpperCase()))?.id ?? '';
  const resolvedLoanId = paramLoanId || activeLoanId;

  if (!resolvedLoanId) {
    return (
      <Screen>
        <TopNav title="Repay methods" onBack={() => router.back()} />
        <EmptyState title="No active loan" body="You need an active loan before selecting a repayment method." />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopNav title="Repay methods" subtitle="Choose how you want to complete repayment." onBack={() => router.back()} />
      <View style={styles.list}>
        {METHODS.map((method) => (
          <Pressable
            key={method.value}
            onPress={() => router.push({ pathname: '/repay/pay-now', params: { loanId: resolvedLoanId, method: method.value } } as never)}
          >
            <Card style={styles.card}>
              <Text style={styles.title}>{method.title}</Text>
              <Text style={styles.body}>{method.body}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
      <Button label="Continue with card" onPress={() => router.push({ pathname: '/repay/pay-now', params: { loanId: resolvedLoanId, method: 'CARD' } } as never)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm
  },
  card: {
    gap: spacing.xs
  },
  title: {
    ...typography.subtitle,
    color: colors.text
  },
  body: {
    ...typography.body,
    color: colors.textMuted
  }
});
