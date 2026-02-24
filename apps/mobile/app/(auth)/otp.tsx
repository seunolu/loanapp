import { router } from 'expo-router';
import * as React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../src/providers/auth-provider';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Input } from '../../src/ui/Input';
import { Screen } from '../../src/ui/Screen';
import { colors, typography } from '../../src/ui/theme';

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
    <Screen>
      <Text style={styles.title}>Verify your number</Text>
      <Card>
        <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="One-time code" value={code} onChangeText={setCode} keyboardType="number-pad" />
        <Button label="Verify" onPress={onVerify} loading={loading} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text }
});
