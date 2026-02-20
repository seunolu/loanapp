import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../src/ui/Badge';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { SectionHeader } from '../../src/ui/SectionHeader';
import { colors, spacing, typography } from '../../src/ui/theme';

export default function HomeScreen() {
  return (
    <Screen>
      <SectionHeader title="Good morning" subtitle="Here is your portfolio snapshot." />
      <Card>
        <Text style={styles.amount}>NGN 0.00</Text>
        <Text style={styles.muted}>Outstanding balance</Text>
        <Badge label="No active delinquency" tone="success" />
      </Card>
      <Card>
        <SectionHeader title="Quick actions" />
        <View style={styles.actions}>
          <Link href={'/loans' as any} asChild>
            <Button label="Apply for loan" />
          </Link>
          <Link href={'/repay' as any} asChild>
            <Button label="Repay now" variant="secondary" />
          </Link>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: { ...typography.display, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  actions: { gap: spacing.sm }
});
