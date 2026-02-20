import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../../../../src/ui/Button';
import { Card } from '../../../../src/ui/Card';
import { Screen } from '../../../../src/ui/Screen';
import { SectionHeader } from '../../../../src/ui/SectionHeader';
import { colors, spacing, typography } from '../../../../src/ui/theme';

export default function ReviewLoanScreen() {
  const [accepted, setAccepted] = React.useState(false);

  return (
    <Screen>
      <SectionHeader title="Review application" subtitle="Confirm details before submission." />
      <Card>
        <Row label="Amount" value="NGN 150,000" />
        <Row label="Tenor" value="60 days" />
        <Row label="Interest" value="8%" />
        <Row label="Total Repayable" value="NGN 162,000" />
      </Card>
      <Card>
        <View style={styles.row}>
          <Text style={styles.body}>I accept terms and repayment policy.</Text>
          <Switch value={accepted} onValueChange={setAccepted} />
        </View>
      </Card>
      <Button
        label="Submit Application"
        disabled={!accepted}
        onPress={() => router.replace('/loans/apply/submitted?id=loan_mock_001' as any)}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { ...typography.body, color: colors.textMuted },
  value: { ...typography.body, color: colors.text, fontWeight: '600' },
  body: { ...typography.body, color: colors.text }
});
