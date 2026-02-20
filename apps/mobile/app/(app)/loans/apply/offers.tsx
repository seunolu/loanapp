import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../../src/ui/Badge';
import { Button } from '../../../../src/ui/Button';
import { Card } from '../../../../src/ui/Card';
import { Screen } from '../../../../src/ui/Screen';
import { SectionHeader } from '../../../../src/ui/SectionHeader';
import { colors, spacing, typography } from '../../../../src/ui/theme';

export default function OffersScreen() {
  return (
    <Screen>
      <SectionHeader title="Your Offer" subtitle="Based on your profile and history." />
      <Card>
        <Text style={styles.amount}>NGN 50,000 - NGN 500,000</Text>
        <Text style={styles.body}>Eligible amount range</Text>
        <View style={styles.badges}>
          <Badge label="30 days" tone="info" />
          <Badge label="60 days" tone="info" />
          <Badge label="90 days" tone="info" />
        </View>
      </Card>
      <Button label="Continue" onPress={() => router.push('/loans/apply/configure' as any)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: { ...typography.display, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }
});
