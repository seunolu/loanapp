import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useKyc } from '../../../src/providers/kyc-provider';
import { Badge } from '../../../src/ui/Badge';
import { Button } from '../../../src/ui/Button';
import { Card } from '../../../src/ui/Card';
import { Screen } from '../../../src/ui/Screen';
import { SectionHeader } from '../../../src/ui/SectionHeader';
import { colors, spacing, typography } from '../../../src/ui/theme';

export default function LoansIndexScreen() {
  const { isComplete } = useKyc();

  return (
    <Screen>
      <SectionHeader title="My Loans" subtitle="Track active and past applications." />
      <Card>
        <Text style={styles.header}>Active Loan</Text>
        <Text style={styles.body}>No active loan yet.</Text>
        <Badge label="No active loan" tone="muted" />
      </Card>
      <Card>
        <Text style={styles.header}>Past Loans</Text>
        <Text style={styles.body}>Your past repayment history will appear here.</Text>
      </Card>
      {!isComplete ? (
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>KYC required</Text>
          <Text style={styles.body}>Complete KYC before applying for a loan.</Text>
          <Link href={'/profile/kyc' as any} asChild>
            <Button label="Complete KYC" variant="secondary" />
          </Link>
        </Card>
      ) : null}
      <View style={styles.cta}>
        <Link href={(isComplete ? '/loans/apply/offers' : '/profile/kyc') as any} asChild>
          <Button label="Apply for a Loan" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { ...typography.subtitle, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  cta: { marginTop: spacing.sm },
  warningCard: { borderColor: '#F2D29A', backgroundColor: '#FFF9ED' },
  warningTitle: { ...typography.subtitle, color: colors.warning }
});
