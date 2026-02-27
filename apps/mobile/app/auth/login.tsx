import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getSelectedTenantConfig, requestOtp } from '../../src/lib/api';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tenantQuery = useQuery({
    queryKey: ['tenant', 'selected'],
    queryFn: () => getSelectedTenantConfig()
  });

  const otpRequest = useMutation({
    mutationFn: async (targetPhone: string) => requestOtp(targetPhone.trim()),
    onSuccess: (payload) => {
      setError(null);
      router.push({
        pathname: '/auth/verify',
        params: {
          phone: phone.trim(),
          otpRef: payload.otpRef
        }
      });
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'Unable to request OTP.');
    }
  });

  const onRequestOtp = () => {
    if (!phone.trim()) {
      setError('Enter phone number.');
      return;
    }
    otpRequest.mutate(phone);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Borrower Login</Text>
        {tenantQuery.data ? <Text style={styles.subtitle}>{tenantQuery.data.branding.displayName}</Text> : null}
        <TextInput
          keyboardType="phone-pad"
          onChangeText={setPhone}
          placeholder="+2348012345678"
          style={styles.input}
          value={phone}
        />
        <Pressable disabled={otpRequest.isPending} onPress={onRequestOtp} style={styles.button}>
          {otpRequest.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Request OTP</Text>}
        </Pressable>
        {__DEV__ ? (
          <Pressable onPress={() => router.replace('/tenant')}>
            <Text style={styles.link}>Change lender (dev)</Text>
          </Pressable>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#0b1720' },
  subtitle: { fontSize: 16, color: '#1f2937' },
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
  link: { color: '#1d4ed8', fontWeight: '600' },
  error: { color: '#b91c1c' }
});
