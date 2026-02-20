import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../../src/ui/Button';
import { Card } from '../../../../src/ui/Card';
import { Screen } from '../../../../src/ui/Screen';
import { SectionHeader } from '../../../../src/ui/SectionHeader';
import { colors, spacing, typography } from '../../../../src/ui/theme';

export default function ConfigureLoanScreen() {
  const [amount, setAmount] = React.useState(150000);
  const [tenor, setTenor] = React.useState(60);
  const totalRepayable = Math.round(amount * 1.08);

  return (
    <Screen>
      <SectionHeader title="Configure Loan" subtitle="Choose amount and tenor." />
      <Card>
        <Text style={styles.label}>Amount</Text>
        <View style={styles.row}>
          {[100000, 150000, 250000].map((v) => (
            <Button key={v} label={`NGN ${v / 1000}k`} variant={amount === v ? 'primary' : 'secondary'} onPress={() => setAmount(v)} />
          ))}
        </View>
        <Text style={styles.label}>Tenor</Text>
        <View style={styles.row}>
          {[30, 60, 90].map((d) => (
            <Button key={d} label={`${d} days`} variant={tenor === d ? 'primary' : 'secondary'} onPress={() => setTenor(d)} />
          ))}
        </View>
      </Card>
      <Card>
        <Text style={styles.summary}>Total repayable: NGN {totalRepayable.toLocaleString()}</Text>
        <Text style={styles.caption}>Estimated weekly repayment schedule preview available at review step.</Text>
      </Card>
      <Button label="Continue to Review" onPress={() => router.push('/loans/apply/review' as any)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.caption, color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  summary: { ...typography.subtitle, color: colors.text },
  caption: { ...typography.body, color: colors.textMuted }
});
