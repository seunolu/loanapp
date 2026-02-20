import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useKyc } from '../../../../src/providers/kyc-provider';
import { Badge } from '../../../../src/ui/Badge';
import { Button } from '../../../../src/ui/Button';
import { Card } from '../../../../src/ui/Card';
import { Screen } from '../../../../src/ui/Screen';
import { SectionHeader } from '../../../../src/ui/SectionHeader';
import { colors, radius, spacing, typography } from '../../../../src/ui/theme';

export default function KycChecklistScreen() {
  const { checklist, percentComplete, isComplete, identityStatus } = useKyc();
  const next = checklist.find((item) => !item.completed)?.key;

  return (
    <Screen>
      <SectionHeader title="KYC Checklist" subtitle="Complete all steps before loan application." />
      <Card>
        <Text style={styles.progressLabel}>{percentComplete}% complete</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentComplete}%` }]} />
        </View>
      </Card>
      <Card>
        {identityStatus === 'MANUAL_REVIEW' ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>Identity review is pending. Loan application remains blocked.</Text>
          </View>
        ) : null}
        {checklist.map((step) => (
          <View key={step.key} style={styles.row}>
            <Text style={styles.step}>{step.label}</Text>
            <Badge label={step.completed ? 'Done' : 'Pending'} tone={step.completed ? 'success' : 'warning'} />
          </View>
        ))}
      </Card>
      {next ? (
        <Button label="Continue" onPress={() => router.push(`/profile/kyc/${next}` as any)} />
      ) : (
        <Link href={'/loans' as any} asChild>
          <Button label={isComplete ? 'Proceed to Loan Application' : 'Done'} />
        </Link>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressLabel: { ...typography.body, color: colors.text },
  progressTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm
  },
  step: { ...typography.body, color: colors.text, flex: 1 }
  ,
  alert: { backgroundColor: '#FFF9ED', borderColor: '#F2D29A', borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  alertText: { ...typography.caption, color: colors.warning }
});
