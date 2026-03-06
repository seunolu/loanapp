import { Link, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { formatMoneyNGN } from '../../../src/lib/format';
import { Badge, Button, Card, Screen, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

export default function RepaySuccessScreen() {
  const params = useLocalSearchParams<{ amount?: string | string[]; reference?: string | string[] }>();
  const amount = Number(Array.isArray(params.amount) ? params.amount[0] ?? '0' : params.amount ?? '0');
  const reference = Array.isArray(params.reference) ? params.reference[0] ?? '-' : params.reference ?? '-';

  return (
    <Screen>
      <TopNav title="Repayment successful" onBack={() => router.replace('/repay' as never)} />
      <Card style={styles.card}>
        <Badge tone="success" label="Success" />
        <Text style={styles.amount}>{formatMoneyNGN(amount, 'naira')}</Text>
        <Text style={styles.body}>Reference: {reference}</Text>
        <Text style={styles.body}>Your repayment has been recorded and your balance will refresh shortly.</Text>
      </Card>
      <Button label="Back to repay" onPress={() => router.replace('/repay' as never)} />
      <Link href={'/transactions' as never} asChild>
        <Button label="View transactions" variant="secondary" />
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  amount: {
    ...typography.display,
    color: colors.text
  },
  body: {
    ...typography.body,
    color: colors.textMuted
  }
});
