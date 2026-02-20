import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Input } from '../../src/ui/Input';
import { Screen } from '../../src/ui/Screen';
import { colors, typography } from '../../src/ui/theme';

export default function ResetPasswordScreen() {
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <Screen>
      <Text style={styles.title}>Reset password</Text>
      <Card>
        <Input label="Reset Code" value={code} onChangeText={setCode} />
        <Input label="New Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button label="Update password" onPress={() => router.replace('/login' as any)} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text }
});
