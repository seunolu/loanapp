import { router } from 'expo-router';
import * as React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Input } from '../../src/ui/Input';
import { Screen } from '../../src/ui/Screen';
import { colors, typography } from '../../src/ui/theme';
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
    <Screen>
      <Text style={styles.title}>Create your account</Text>
      <Card>
        <Input label="Full Name" value={fullName} onChangeText={setFullName} />
        <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button label="Continue" onPress={onContinue} loading={loading} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text }
});
