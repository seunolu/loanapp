import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { clearLocalAppState } from '../../../src/lib/storage';
import { getAppLockEnabled, requestAppUnlock, setAppLockEnabled } from '../../../src/security/app-lock';
import { useAuth } from '../../../src/providers/auth-provider';
import { useTenant } from '../../../src/tenant/tenant-context';
import { Button, Card, Screen, SectionHeader, colors, typography } from '../../../src/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { clearTenant } = useTenant();
  const [resetting, setResetting] = useState(false);
  const [appLockEnabled, setAppLockValue] = useState(false);
  const [appLockSaving, setAppLockSaving] = useState(false);

  useEffect(() => {
    void getAppLockEnabled().then(setAppLockValue).catch(() => undefined);
  }, []);

  const toggleAppLock = async (nextValue: boolean) => {
    if (appLockSaving) {
      return;
    }
    setAppLockSaving(true);
    try {
      if (nextValue) {
        const unlocked = await requestAppUnlock();
        if (!unlocked) {
          Alert.alert('App Lock unavailable', 'Enable a device biometric/PIN first, then try again.');
          return;
        }
      }
      await setAppLockEnabled(nextValue);
      setAppLockValue(nextValue);
    } finally {
      setAppLockSaving(false);
    }
  };

  const resetLocalState = () => {
    Alert.alert('Reset local app state?', 'This clears local auth, tenant, and device info on this emulator only.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            setResetting(true);
            await logout();
            await clearLocalAppState();
            clearTenant();
            router.replace('/tenant');
            Alert.alert('Done', 'Local app state was cleared.');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reset local app state.';
            Alert.alert('Reset failed', message);
          } finally {
            setResetting(false);
          }
        }
      }
    ]);
  };

  return (
    <Screen>
      <SectionHeader title="Settings" subtitle="Security and app preferences." />
      <Card>
        <Text style={styles.title}>Security</Text>
        <Button label="Change Password (coming soon)" variant="secondary" />
        <View style={styles.lockRow}>
          <Text style={styles.body}>App Lock</Text>
          <Switch value={appLockEnabled} onValueChange={(value) => void toggleAppLock(value)} disabled={appLockSaving} />
        </View>
      </Card>
      <Card>
        <Text style={styles.title}>App version</Text>
        <Text style={styles.body}>{Constants.expoConfig?.version ?? 'dev'}</Text>
      </Card>
      {__DEV__ ? (
        <Card>
          <Text style={styles.title}>Developer Tools</Text>
          <Text style={styles.body}>Use this to quickly reset emulator state for repeat testing.</Text>
          <Button
            label="Reset Local App State"
            loading={resetting}
            onPress={resetLocalState}
            variant="danger"
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.subtitle, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  lockRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
});

