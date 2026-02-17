import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createLoanApplication } from '../src/lib/tenant-sdk';
import { useTenant } from '../src/tenant/tenant-context';

export default function LoanApplyScreen() {
  const tenant = useTenant();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [tenorMonths, setTenorMonths] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = Number(amount);
      const parsedTenorMonths = Number(tenorMonths);
      return createLoanApplication(
        {
          apiBaseUrl: tenant.apiBaseUrl,
          tenantSlug: tenant.tenantSlug,
          tenantId: tenant.tenantId
        },
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          amount: parsedAmount,
          tenorMonths: parsedTenorMonths
        }
      );
    },
    onSuccess: (result) => {
      Alert.alert('Application submitted', `ID: ${result.id}\nStatus: ${result.status}`);
      setAmount('');
      setTenorMonths('');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to submit application.';
      Alert.alert('Submission failed', message);
    }
  });

  const onSubmit = () => {
    if (!tenant.tenantId) {
      Alert.alert('Tenant missing', 'Resolve tenant first from the tenant screen.');
      return;
    }
    if (!fullName.trim() || !phone.trim() || !amount.trim() || !tenorMonths.trim()) {
      Alert.alert('Missing fields', 'Enter full name, phone, amount, and tenor months.');
      return;
    }

    const parsedAmount = Number(amount);
    const parsedTenorMonths = Number(tenorMonths);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Amount must be a positive number.');
      return;
    }
    if (!Number.isFinite(parsedTenorMonths) || parsedTenorMonths <= 0) {
      Alert.alert('Invalid tenor', 'Tenor months must be a positive number.');
      return;
    }

    createMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Loan Application</Text>
          <Text style={styles.subtitle}>Tenant: {tenant.tenantSlug || '-'}</Text>
          <TextInput placeholder="Full name" style={styles.input} value={fullName} onChangeText={setFullName} />
          <TextInput
            autoCapitalize="none"
            keyboardType="phone-pad"
            placeholder="Phone"
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            keyboardType="numeric"
            placeholder="Amount"
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            keyboardType="numeric"
            placeholder="Tenor (months)"
            style={styles.input}
            value={tenorMonths}
            onChangeText={setTenorMonths}
          />
          <Pressable disabled={createMutation.isPending} onPress={onSubmit} style={styles.button}>
            {createMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Application</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#0b1720' },
  subtitle: { color: '#334155' },
  input: {
    borderWidth: 1,
    borderColor: '#c7d2d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  button: {
    marginTop: 8,
    backgroundColor: '#0b1720',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '600' }
});

