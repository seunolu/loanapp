import { Link } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Screen, SectionHeader, colors, typography } from '../../../src/ui';
import { listMyMandates } from '../../../src/lib/api';

export default function RepayIndexScreen() {
  const mandatesQuery = useQuery({
    queryKey: ['borrower', 'mandates'],
    queryFn: listMyMandates
  });
  const activeMandate = useMemo(
    () => (mandatesQuery.data ?? []).find((item) => item.status === 'ACTIVE'),
    [mandatesQuery.data]
  );

  return (
    <Screen>
      <SectionHeader title="Repayment" subtitle="Stay current and avoid penalties." />
      <Card>
        <Text style={styles.metric}>Next due: NGN 0.00</Text>
        <Text style={styles.caption}>Due date: --</Text>
      </Card>
      <Card>
        <Text style={styles.metric}>Outstanding: NGN 0.00</Text>
      </Card>
      <Card>
        <Text style={styles.metric}>Auto-debit</Text>
        <Text style={styles.caption}>
          {activeMandate
            ? `Active (${activeMandate.frequency ?? 'MONTHLY'}) • Next debit ${activeMandate.nextDebitAt?.slice(0, 10) ?? '--'}`
            : 'No active mandate yet.'}
        </Text>
      </Card>
      <Link href={'/repay/pay-now' as any} asChild>
        <Button label="Pay Now" />
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metric: { ...typography.subtitle, color: colors.text },
  caption: { ...typography.body, color: colors.textMuted }
});


