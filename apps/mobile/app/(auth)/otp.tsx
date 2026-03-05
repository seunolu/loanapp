import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { normalizePhoneE164, toNigeriaLocalPhoneInput } from '../../src/lib/phone';
import { useAuth } from '../../src/providers/auth-provider';
import { Button, Card, Input, Screen, ScreenFooter, ScreenHeader } from '../../src/ui';

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone?: string | string[] }>();
  const { verifyOtp } = useAuth();
  const initialPhone = React.useMemo(() => {
    const value = Array.isArray(params.phone) ? params.phone[0] : params.phone;
    return value ? toNigeriaLocalPhoneInput(value) : '';
  }, [params.phone]);
  const [phoneLocal, setPhoneLocal] = React.useState(initialPhone);
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onVerify = async () => {
    const normalizedPhone = normalizePhoneE164(phoneLocal);
    if (!normalizedPhone || !/^\+234\d{10}$/.test(normalizedPhone)) {
      Alert.alert('Invalid phone', 'Enter a valid 10-digit Nigerian phone number.');
      return;
    }

    try {
      setLoading(true);
      await verifyOtp({ phone: normalizedPhone, code });
      router.replace('/home' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify OTP. Please try again.';
      Alert.alert('Verification failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      preset="fixed"
      safeTop={false}
      header={<ScreenHeader title="Verify your number" subtitle="Enter the OTP sent to your phone" showBack safeTop />}
      footer={
        <ScreenFooter>
          <Button label="Verify" onPress={onVerify} loading={loading} fullWidth />
        </ScreenFooter>
      }
    >
      <Card>
        <Input
          label="Phone Number"
          value={phoneLocal}
          onChangeText={(value) => setPhoneLocal(toNigeriaLocalPhoneInput(value))}
          keyboardType="phone-pad"
          placeholder="8012345678"
          leftAccessory={<Text style={styles.prefix}>+234</Text>}
        />
        <Input label="One-time code" value={code} onChangeText={setCode} keyboardType="number-pad" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  prefix: {
    fontWeight: '700'
  }
});
