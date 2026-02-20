import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { getHardshipRequest } from '../../../src/lib/api';

export default function HardshipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hardshipId = Array.isArray(id) ? id[0] : id;
  const detailQuery = useQuery({
    queryKey: ['borrower', 'hardship', hardshipId],
    queryFn: () => getHardshipRequest(hardshipId ?? ''),
    enabled: Boolean(hardshipId)
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {detailQuery.isLoading ? <Text style={styles.muted}>Loading...</Text> : null}
        {detailQuery.error ? <Text style={styles.error}>Failed to load hardship request.</Text> : null}
        {detailQuery.data ? (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>{detailQuery.data.type.replaceAll('_', ' ')}</Text>
              <Text style={styles.meta}>Status: {detailQuery.data.status}</Text>
              <Text style={styles.meta}>Created: {new Date(detailQuery.data.createdAt).toLocaleString()}</Text>
              {detailQuery.data.decisionNotes ? <Text style={styles.reason}>Decision: {detailQuery.data.decisionNotes}</Text> : null}
              <Text style={styles.reason}>{detailQuery.data.reason}</Text>
            </View>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <FlatList
              data={detailQuery.data.history}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.timelineCard}>
                  <Text style={styles.meta}>
                    {item.fromStatus} → {item.toStatus}
                  </Text>
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              )}
            />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  container: { flex: 1, padding: 16, gap: 10 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionTitle: { fontWeight: '700', color: '#111827' },
  timelineCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginTop: 8 },
  reason: { color: '#111827', marginTop: 6 },
  meta: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  muted: { color: '#6b7280' },
  error: { color: '#b91c1c' }
});

