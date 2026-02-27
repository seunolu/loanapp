import { Link, router } from 'expo-router';
import * as React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Button, Card, Input, Screen, ScreenFooter, ScreenHeader, colors, spacing, typography } from '../../src/ui';
import { useAuth } from '../../src/providers/auth-provider';

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await login({ phone, password });
      router.replace('/home' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to log in. Please try again.';
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      preset="fixed"
      safeTop={false}
      header={<ScreenHeader title="Welcome back" subtitle="Log in to continue" safeTop />}
      footer={
        <ScreenFooter style={styles.footer}>
          <Link href={'/forgot-password' as any} style={styles.link}>
            Forgot password?
          </Link>
          <Link href={'/signup' as any} style={styles.link}>
            New here? Create account
          </Link>
        </ScreenFooter>
      }
    >
      <Card>
        <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button label="Log In" onPress={onSubmit} loading={loading} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.xs },
  link: { ...typography.body, color: colors.info }
});
