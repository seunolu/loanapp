import { Link, router } from 'expo-router';
import * as React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Button, Card, Input, Screen, ScreenFooter, ScreenHeader, colors, spacing, typography } from '../../src/ui';
import { useAuth } from '../../src/providers/auth-provider';
import { normalizePhoneE164, toNigeriaLocalPhoneInput } from '../../src/lib/phone';

export default function LoginScreen() {
  const { login } = useAuth();
  const [phoneLocal, setPhoneLocal] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async () => {
    const normalizedPhone = normalizePhoneE164(phoneLocal);
    if (!normalizedPhone || !/^\+234\d{10}$/.test(normalizedPhone)) {
      Alert.alert('Invalid phone', 'Enter a valid 10-digit Nigerian phone number.');
      return;
    }

    try {
      setLoading(true);
      await login({ phone: normalizedPhone, password });
      router.push(`/otp?phone=${encodeURIComponent(normalizedPhone)}` as any);
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
        <Input
          label="Phone Number"
          value={phoneLocal}
          onChangeText={(value) => setPhoneLocal(toNigeriaLocalPhoneInput(value))}
          keyboardType="phone-pad"
          placeholder="8012345678"
          leftAccessory={<Text style={styles.prefix}>+234</Text>}
        />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button label="Log In" onPress={onSubmit} loading={loading} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.xs },
  link: { ...typography.body, color: colors.info },
  prefix: { fontWeight: '700' }
});
