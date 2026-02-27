import { router } from 'expo-router';
import * as React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../src/providers/auth-provider';
import { Button, Card, Input, Screen, ScreenFooter, ScreenHeader } from '../../src/ui';

export default function OtpScreen() {
  const { verifyOtp } = useAuth();
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onVerify = async () => {
    try {
      setLoading(true);
      await verifyOtp({ phone, code });
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
        <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="One-time code" value={code} onChangeText={setCode} keyboardType="number-pad" />
      </Card>
    </Screen>
  );
}

