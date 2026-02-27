import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { clearLocalAppState } from '../../src/lib/storage';
import { useAuth } from '../../src/providers/auth-provider';
import { useTenant } from '../../src/tenant/tenant-context';
import { Badge, Button, Card, Screen, SectionHeader, colors, spacing, typography } from '../../src/ui';

export default function HomeScreen() {
  const { logout } = useAuth();
  const { clearTenant } = useTenant();
  const [isResetting, setIsResetting] = useState(false);

  const onResetLocalState = () => {
    Alert.alert('Reset local app state?', 'This clears local auth, tenant, and device info on this emulator only.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsResetting(true);
            await logout();
            await clearLocalAppState();
            clearTenant();
            Alert.alert('Done', 'Local app state was cleared.');
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Failed to reset local app state.';
            Alert.alert('Reset failed', message);
          } finally {
            setIsResetting(false);
          }
        }
      }
    ]);
  };

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
          <Button label="Reset Local App State" loading={isResetting} onPress={onResetLocalState} variant="danger" />
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


