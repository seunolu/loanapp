import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { formatMoneyNGN } from '../../../src/lib/format';
import { Button, Card, Screen, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

export default function RepayProcessingScreen() {
  const params = useLocalSearchParams<{ amount?: string | string[]; method?: string | string[]; reference?: string | string[] }>();
  const amount = Number(Array.isArray(params.amount) ? params.amount[0] ?? '0' : params.amount ?? '0');
  const method = Array.isArray(params.method) ? params.method[0] ?? 'CARD' : params.method ?? 'CARD';
  const reference = Array.isArray(params.reference) ? params.reference[0] ?? '-' : params.reference ?? '-';

  return (
    <Screen>
      <TopNav title="Processing" subtitle="We are waiting for payment confirmation." onBack={() => router.replace('/repay' as never)} />
      <Card style={styles.card}>
        <Text style={styles.title}>Payment in progress</Text>
        <Text style={styles.amount}>{formatMoneyNGN(amount, 'naira')}</Text>
        <Text style={styles.body}>Method: {method}</Text>
        <Text style={styles.body}>Reference: {reference}</Text>
      </Card>
      <View style={styles.actions}>
        <Button label="I completed payment" onPress={() => router.replace({ pathname: '/repay/success', params: { amount: String(amount), reference } } as never)} />
        <Button label="Payment failed" variant="secondary" onPress={() => router.replace({ pathname: '/repay/failed', params: { amount: String(amount), reference } } as never)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  title: {
    ...typography.subtitle,
    color: colors.text
  },
  amount: {
    ...typography.display,
    color: colors.text
  },
  body: {
    ...typography.body,
    color: colors.textMuted
  },
  actions: {
    gap: spacing.sm
  }
});
