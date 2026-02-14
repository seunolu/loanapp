import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getMe, verifyOtp } from '../../src/lib/api';
import { useSetSessionMe } from '../../src/features/session/use-session-bootstrap';

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ phone?: string; otpRef?: string }>();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setSessionMe = useSetSessionMe();

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!params.phone || !params.otpRef) {
        throw new Error('Missing OTP challenge.');
      }
      await verifyOtp({ phone: params.phone, otpRef: params.otpRef, otp: otp.trim() });
      return getMe();
    },
    onSuccess: (me) => {
      setSessionMe(me);
      setError(null);
      router.replace('/home');
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'OTP verification failed.');
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Phone: {params.phone ?? '-'}</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={setOtp}
          placeholder="123456"
          style={styles.input}
          value={otp}
        />
        <Pressable disabled={verifyMutation.isPending} onPress={() => verifyMutation.mutate()} style={styles.button}>
          {verifyMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#0b1720' },
  subtitle: { fontSize: 15, color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#c7d2d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  button: { backgroundColor: '#0b1720', borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b91c1c' }
});
