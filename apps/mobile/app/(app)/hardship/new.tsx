import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createHardshipRequest, type BorrowerHardshipType } from '../../../src/lib/api';

const TYPES: BorrowerHardshipType[] = ['PAYMENT_PAUSE', 'TENOR_EXTENSION', 'RATE_REDUCTION'];

export default function NewHardshipScreen() {
  const queryClient = useQueryClient();
  const [loanApplicationId, setLoanApplicationId] = useState('');
  const [type, setType] = useState<BorrowerHardshipType>('PAYMENT_PAUSE');
  const [reason, setReason] = useState('');
  const [pauseDays, setPauseDays] = useState('');
  const [proposedTenorMonths, setProposedTenorMonths] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(() => {
    return {
      loanApplicationId: loanApplicationId.trim(),
      type,
      reason: reason.trim(),
      pauseDays: pauseDays.trim() ? Number(pauseDays) : undefined,
      proposedTenorMonths: proposedTenorMonths.trim() ? Number(proposedTenorMonths) : undefined,
      proposedRate: proposedRate.trim() ? Number(proposedRate) : undefined
    };
  }, [loanApplicationId, type, reason, pauseDays, proposedTenorMonths, proposedRate]);

  const createMutation = useMutation({
    mutationFn: async () => createHardshipRequest(payload),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['borrower', 'hardship'] });
      router.replace(`/(app)/hardship/${created.id}` as never);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to submit hardship request.')
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.label}>Loan Application ID</Text>
        <TextInput
          value={loanApplicationId}
          onChangeText={setLoanApplicationId}
          style={styles.input}
          placeholder="loan_application_id"
        />

        <Text style={styles.label}>Request Type</Text>
        <View style={styles.row}>
          {TYPES.map((entry) => (
            <Pressable
              key={entry}
              onPress={() => setType(entry)}
              style={[styles.pill, type === entry ? styles.pillActive : null]}
            >
              <Text style={type === entry ? styles.pillTextActive : styles.pillText}>{entry.replaceAll('_', ' ')}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Reason</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          style={[styles.input, styles.textarea]}
          placeholder="Explain your hardship request"
          multiline
        />

        {type === 'PAYMENT_PAUSE' ? (
          <>
            <Text style={styles.label}>Pause Days</Text>
            <TextInput value={pauseDays} onChangeText={setPauseDays} style={styles.input} keyboardType="number-pad" />
          </>
        ) : null}
        {type === 'TENOR_EXTENSION' ? (
          <>
            <Text style={styles.label}>Proposed Tenor (months)</Text>
            <TextInput
              value={proposedTenorMonths}
              onChangeText={setProposedTenorMonths}
              style={styles.input}
              keyboardType="number-pad"
            />
          </>
        ) : null}
        {type === 'RATE_REDUCTION' ? (
          <>
            <Text style={styles.label}>Proposed Rate (%)</Text>
            <TextInput value={proposedRate} onChangeText={setProposedRate} style={styles.input} keyboardType="decimal-pad" />
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={[styles.button, createMutation.isPending ? styles.buttonDisabled : null]}
          disabled={createMutation.isPending}
          onPress={() => {
            setError(null);
            if (!payload.loanApplicationId) {
              setError('Loan application id is required.');
              return;
            }
            if (payload.reason.length < 3) {
              setError('Reason is too short.');
              return;
            }
            createMutation.mutate();
          }}
        >
          <Text style={styles.buttonText}>{createMutation.isPending ? 'Submitting...' : 'Submit Request'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  container: { flex: 1, padding: 16, gap: 10 },
  label: { color: '#111827', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillActive: { backgroundColor: '#0b1720', borderColor: '#0b1720' },
  pillText: { color: '#111827', fontSize: 12 },
  pillTextActive: { color: '#fff', fontSize: 12 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  button: { backgroundColor: '#0b1720', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 6 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b91c1c' }
});

