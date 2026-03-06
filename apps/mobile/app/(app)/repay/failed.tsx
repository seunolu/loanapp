import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Button, Card, Screen, Text, TopNav, colors, spacing, typography } from '../../../src/ui';

export default function RepayFailedScreen() {
  const params = useLocalSearchParams<{ reference?: string | string[] }>();
  const reference = Array.isArray(params.reference) ? params.reference[0] ?? '-' : params.reference ?? '-';

  return (
    <Screen>
      <TopNav title="Repayment failed" onBack={() => router.replace('/repay' as never)} />
      <Card style={styles.card}>
        <Text style={styles.title}>We could not confirm this repayment.</Text>
        <Text style={styles.body}>Reference: {reference}</Text>
        <Text style={styles.body}>Try again, choose another method, or contact support if the issue persists.</Text>
      </Card>
      <Button label="Try again" onPress={() => router.replace('/repay/pay-now' as never)} />
      <Button label="Contact support" variant="secondary" onPress={() => router.push('/support/new' as never)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  title: {
    ...typography.subtitle,
    color: colors.danger
  },
  body: {
    ...typography.body,
    color: colors.textMuted
  }
});
