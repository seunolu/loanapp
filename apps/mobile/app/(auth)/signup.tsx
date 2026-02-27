import { router } from 'expo-router';
import * as React from 'react';
import { Alert } from 'react-native';
import { Button, Card, Input, Screen, ScreenFooter, ScreenHeader } from '../../src/ui';
import { useAuth } from '../../src/providers/auth-provider';

export default function SignupScreen() {
  const { signup } = useAuth();
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onContinue = async () => {
    try {
      setLoading(true);
      await signup({ fullName, phone, password });
      router.push('/otp' as any);
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
        <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      </Card>
    </Screen>
  );
}

