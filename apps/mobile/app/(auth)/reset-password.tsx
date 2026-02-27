import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, Card, Input, Screen, colors, typography } from '../../src/ui';

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


