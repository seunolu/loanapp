import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { getInAppNotificationsEnabled, setInAppNotificationsEnabled } from '../../../src/lib/preferences';
import { Card, Screen, Text, TopNav, colors, typography } from '../../../src/ui';

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    void getInAppNotificationsEnabled().then(setEnabled).catch(() => undefined);
  }, []);

  const onToggle = async (nextValue: boolean) => {
    setEnabled(nextValue);
    await setInAppNotificationsEnabled(nextValue);
  };

  return (
    <Screen>
      <TopNav title="Notification preferences" subtitle="Choose how the app should alert you." onBack={() => router.back()} />
      <Card>
        <Text style={styles.title}>In-app notifications</Text>
        <Text style={styles.body}>Keep account, repayment, and support alerts inside the app.</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Enable in-app alerts</Text>
          <Switch value={enabled} onValueChange={(value) => void onToggle(value)} />
        </View>
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
