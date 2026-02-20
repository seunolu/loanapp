import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../src/ui/Badge';
import { Card } from '../../../src/ui/Card';
import { Screen } from '../../../src/ui/Screen';
import { SectionHeader } from '../../../src/ui/SectionHeader';
import { colors, spacing, typography } from '../../../src/ui/theme';

const timeline = ['SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'DISBURSED'];

export default function LoanStatusScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const current = 'UNDER_REVIEW';
  return (
    <Screen>
      <SectionHeader title={`Application ${params.id}`} subtitle="Status tracker" />
      <Card>
        <Badge label={current} tone="info" />
        <View style={styles.timeline}>
          {timeline.map((item, idx) => (
            <View key={item} style={styles.timelineRow}>
              <View style={[styles.dot, idx <= timeline.indexOf(current) ? styles.dotActive : null]} />
              <Text style={styles.timelineText}>{item.replaceAll('_', ' ')}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={styles.title}>Document upload</Text>
        <Text style={styles.caption}>If requested, upload UI will appear here. Endpoint integration comes next.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  timeline: { gap: spacing.sm },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 10, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  timelineText: { ...typography.body, color: colors.text },
  title: { ...typography.subtitle, color: colors.text },
  caption: { ...typography.body, color: colors.textMuted }
});

