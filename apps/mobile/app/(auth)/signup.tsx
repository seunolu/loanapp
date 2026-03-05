import { router } from 'expo-router';
import * as React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Button, Card, Input, Screen, ScreenFooter, ScreenHeader } from '../../src/ui';
import { useAuth } from '../../src/providers/auth-provider';
import { normalizePhoneE164, toNigeriaLocalPhoneInput } from '../../src/lib/phone';

export default function SignupScreen() {
  const { signup } = useAuth();
  const [fullName, setFullName] = React.useState('');
  const [phoneLocal, setPhoneLocal] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onContinue = async () => {
    const normalizedPhone = normalizePhoneE164(phoneLocal);
    if (!normalizedPhone || !/^\+234\d{10}$/.test(normalizedPhone)) {
      Alert.alert('Invalid phone', 'Enter a valid 10-digit Nigerian phone number.');
      return;
    }

    try {
      setLoading(true);
      await signup({ fullName, phone: normalizedPhone, password });
      router.push(`/otp?phone=${encodeURIComponent(normalizedPhone)}` as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      preset="fixed"
      safeTop={false}
      header={<ScreenHeader title="Create your account" showBack safeTop />}
      footer={
        <ScreenFooter>
          <Button label="Continue" onPress={onContinue} loading={loading} fullWidth />
        </ScreenFooter>
      }
    >
      <Card>
        <Input label="Full Name" value={fullName} onChangeText={setFullName} />
        <Input
          label="Phone Number"
          value={phoneLocal}
          onChangeText={(value) => setPhoneLocal(toNigeriaLocalPhoneInput(value))}
          keyboardType="phone-pad"
          placeholder="8012345678"
          helperText="Enter your 10-digit number"
          leftAccessory={<Text style={styles.prefix}>+234</Text>}
        />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  prefix: {
    fontWeight: '700'
  }
});
