import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Input } from '../../src/ui/Input';
import { Screen } from '../../src/ui/Screen';
import { colors, typography } from '../../src/ui/theme';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = React.useState('');
  return (
    <Screen>
      <Text style={styles.title}>Forgot password</Text>
      <Card>
        <Input label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button label="Send reset code" onPress={() => router.push('/reset-password' as any)} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text }
});
