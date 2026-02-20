import Constants from 'expo-constants';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../../../src/ui/Button';
import { Card } from '../../../src/ui/Card';
import { Screen } from '../../../src/ui/Screen';
import { SectionHeader } from '../../../src/ui/SectionHeader';
import { colors, typography } from '../../../src/ui/theme';

export default function SettingsScreen() {
  return (
    <Screen>
      <SectionHeader title="Settings" subtitle="Security and app preferences." />
      <Card>
        <Text style={styles.title}>Security</Text>
        <Button label="Change Password (coming soon)" variant="secondary" />
      </Card>
      <Card>
        <Text style={styles.title}>App version</Text>
        <Text style={styles.body}>{Constants.expoConfig?.version ?? 'dev'}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.subtitle, color: colors.text },
  body: { ...typography.body, color: colors.textMuted }
});

