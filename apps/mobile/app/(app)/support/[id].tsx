import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { addBorrowerCaseMessage, getBorrowerCase } from '../../../src/lib/api';

export default function SupportCaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = useMemo(() => (Array.isArray(id) ? id[0] : id) ?? '', [id]);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['borrower', 'case', caseId],
    queryFn: () => getBorrowerCase(caseId),
    enabled: Boolean(caseId)
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => addBorrowerCaseMessage(caseId, { message: message.trim() }),
    onSuccess: async () => {
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: ['borrower', 'case', caseId] });
      await queryClient.invalidateQueries({ queryKey: ['borrower', 'cases'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  });

  if (!caseId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.error}>Invalid case id.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {detailQuery.isLoading ? <Text style={styles.muted}>Loading...</Text> : null}
        {detailQuery.error ? <Text style={styles.error}>Failed to load case.</Text> : null}
        {detailQuery.data ? (
          <>
            <View style={styles.header}>
              <Text style={styles.subject}>{detailQuery.data.subject}</Text>
              <Text style={styles.meta}>
                {detailQuery.data.status} • {new Date(detailQuery.data.createdAt).toLocaleString()}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Timeline</Text>
            <FlatList
              data={detailQuery.data.history}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.timelineRow}>
                  <Text style={styles.meta}>
                    {item.fromStatus ?? 'N/A'} → {item.toStatus}
                  </Text>
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              )}
              scrollEnabled={false}
            />

            <Text style={styles.sectionTitle}>Messages</Text>
            <FlatList
              data={detailQuery.data.messages}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={detailQuery.isFetching}
                  onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['borrower', 'case', caseId] })}
                />
              }
              renderItem={({ item }) => (
                <View style={styles.messageCard}>
                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.muted}>No visible messages yet.</Text>}
            />

            <TextInput
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              multiline
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.button, sendMessageMutation.isPending ? styles.buttonDisabled : null]}
              disabled={sendMessageMutation.isPending}
              onPress={() => {
                setError(null);
                if (!message.trim()) {
                  setError('Message is required.');
                  return;
                }
                sendMessageMutation.mutate();
              }}
            >
              <Text style={styles.buttonText}>{sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  container: { flex: 1, padding: 16, gap: 10 },
  header: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  subject: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionTitle: { fontWeight: '700', color: '#111827', marginTop: 6 },
  timelineRow: { backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 6 },
  messageCard: { backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 6 },
  message: { color: '#111827' },
  meta: { color: '#6b7280', fontSize: 12, marginTop: 3 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  button: { backgroundColor: '#0b1720', borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '600' },
  muted: { color: '#6b7280' },
  error: { color: '#b91c1c' }
});

