import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { getAppLockEnabled, requestAppUnlock, setAppLockEnabled } from '../../../src/security/app-lock';
import { Button, Card, Screen, Text, TopNav, colors, typography } from '../../../src/ui';

export default function SecurityScreen() {
  const router = useRouter();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([getAppLockEnabled(), LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]).then(
      ([enabled, hasHardware, enrolled]) => {
        setBiometricsEnabled(enabled);
        setBiometricAvailable(Boolean(hasHardware && enrolled));
      }
    ).catch(() => undefined);
  }, []);

  const toggleBiometrics = async (nextValue: boolean) => {
    if (saving) {
      return;
    }
    if (nextValue && !biometricAvailable) {
      Alert.alert('Biometrics unavailable', 'Set up device biometrics first, then try again.');
      return;
    }
    setSaving(true);
    try {
      if (nextValue) {
        const unlocked = await requestAppUnlock();
        if (!unlocked) {
          Alert.alert('Verification failed', 'We could not verify your device biometrics.');
          return;
        }
      }
      await setAppLockEnabled(nextValue);
      setBiometricsEnabled(nextValue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <TopNav title="Security" subtitle="Manage biometrics and access controls." onBack={() => router.back()} />
      <Card>
        <Text style={styles.title}>Biometrics</Text>
        <Text style={styles.body}>{biometricAvailable ? 'Use your device biometrics to unlock the app.' : 'Biometrics are not available on this device yet.'}</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Enable biometrics</Text>
          <Switch value={biometricsEnabled} onValueChange={(value) => void toggleBiometrics(value)} disabled={saving || !biometricAvailable} />
        </View>
      </Card>
      <Card>
        <Text style={styles.title}>PIN</Text>
        <Text style={styles.body}>PIN management is reserved for the next security iteration.</Text>
        <Button label="Change PIN (coming soon)" variant="secondary" onPress={() => Alert.alert('Coming soon', 'PIN management is not available yet.')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.subtitle, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  label: { ...typography.body, color: colors.text },
  switchRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
});
