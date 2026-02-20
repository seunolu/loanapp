import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../src/ui/components/Badge';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { Screen } from '../../src/ui/components/Screen';
import { TextField } from '../../src/ui/components/TextField';
import { colors, spacing, typography } from '../../src/ui/theme';

export default function UiPreviewScreen(): React.JSX.Element {
  const [value, setValue] = useState('');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>UI Preview</Text>
        <Text style={styles.muted}>Foundational tokens and components for mobile.</Text>

        <Card>
          <Text style={styles.sectionTitle}>Buttons</Text>
          <View style={styles.row}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </View>
          <View style={styles.row}>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Text Fields</Text>
          <TextField label="Loan ID" helper="Paste your loan application id." value={value} onChangeText={setValue} />
          <TextField label="With Error" error="This field is required." value="" onChangeText={() => undefined} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Badges + Mock Loan Item</Text>
          <View style={styles.row}>
            <Badge variant="neutral">SUBMITTED</Badge>
            <Badge variant="warning">OVERDUE</Badge>
            <Badge variant="success">REPAID</Badge>
          </View>
          <View style={styles.loanRow}>
            <View>
              <Text style={styles.loanId}>loan_1a3c...f91d</Text>
              <Text style={styles.loanMeta}>Feb 18, 2026</Text>
            </View>
            <Button size="sm">Open</Button>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.title, color: colors.text },
  muted: { ...typography.body, color: colors.muted },
  sectionTitle: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  loanRow: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  loanId: { ...typography.caption, color: colors.muted, fontFamily: 'monospace' },
  loanMeta: { ...typography.body, color: colors.text }
});

