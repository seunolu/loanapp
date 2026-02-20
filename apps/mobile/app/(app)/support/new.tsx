import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createBorrowerCase, type BorrowerCaseType } from '../../../src/lib/api';

const CASE_TYPES: BorrowerCaseType[] = ['COMPLAINT', 'DISPUTE', 'REQUEST'];

export default function NewSupportCaseScreen() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<BorrowerCaseType>('COMPLAINT');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loanApplicationId, setLoanApplicationId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () =>
      createBorrowerCase({
        type,
        subject: subject.trim(),
        description: description.trim(),
        loanApplicationId: loanApplicationId.trim() || undefined
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['borrower', 'cases'] });
      router.replace(`/(app)/support/${created.id}` as never);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create case.');
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.row}>
          {CASE_TYPES.map((value) => (
            <Pressable
              key={value}
              style={[styles.pill, type === value ? styles.pillActive : null]}
              onPress={() => setType(value)}
            >
              <Text style={type === value ? styles.pillTextActive : styles.pillText}>{value}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Subject</Text>
        <TextInput value={subject} onChangeText={setSubject} style={styles.input} placeholder="Case subject" />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textarea]}
          placeholder="Tell us what happened"
          multiline
        />

        <Text style={styles.label}>Loan Application ID (optional)</Text>
        <TextInput
          value={loanApplicationId}
          onChangeText={setLoanApplicationId}
          style={styles.input}
          placeholder="loan_application_id"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, createMutation.isPending ? styles.buttonDisabled : null]}
          disabled={createMutation.isPending}
          onPress={() => {
            setError(null);
            if (subject.trim().length < 3) {
              setError('Subject must be at least 3 characters.');
              return;
            }
            if (description.trim().length < 10) {
              setError('Description must be at least 10 characters.');
              return;
            }
            createMutation.mutate();
          }}
        >
          <Text style={styles.buttonText}>{createMutation.isPending ? 'Submitting...' : 'Submit Case'}</Text>
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
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#0b1720', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 6 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b91c1c' }
});
