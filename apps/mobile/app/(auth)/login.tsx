import { Link, router } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Input } from '../../src/ui/Input';
import { Screen } from '../../src/ui/Screen';
import { colors, spacing, typography } from '../../src/ui/theme';
import { useAuth } from '../../src/providers/auth-provider';

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async () => {
    setLoading(true);
    await login({ phone, password });
    setLoading(false);
    router.replace('/home' as any);
  };

  return (
    <Screen>
      <Text style={styles.title}>Welcome back</Text>
      <Card>
        <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button label="Log In" onPress={onSubmit} loading={loading} />
      </Card>
      <Link href={'/forgot-password' as any} style={styles.link}>
        Forgot password?
      </Link>
      <Link href={'/signup' as any} style={styles.link}>
        New here? Create account
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text },
  link: { ...typography.body, color: colors.info }
});
