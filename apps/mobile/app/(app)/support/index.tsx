import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { listBorrowerCases } from '../../../src/lib/api';

export default function SupportCasesScreen() {
  const listQuery = useQuery({
    queryKey: ['borrower', 'cases'],
    queryFn: () => listBorrowerCases({ page: 1, limit: 30 })
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Link href={'/(app)/support/new' as never} asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>New Case</Text>
          </Pressable>
        </Link>
        {listQuery.isLoading ? <Text style={styles.muted}>Loading...</Text> : null}
        {listQuery.error ? <Text style={styles.error}>Failed to load support cases.</Text> : null}
        <FlatList
          data={listQuery.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Link href={`/(app)/support/${item.id}` as never} asChild>
              <Pressable style={styles.card}>
                <Text style={styles.subject}>{item.subject}</Text>
                <Text style={styles.meta}>{item.status}</Text>
                <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
              </Pressable>
            </Link>
          )}
          ListEmptyComponent={<Text style={styles.muted}>No cases yet.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  container: { flex: 1, padding: 16, gap: 12 },
  primaryButton: {
    backgroundColor: '#0b1720',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  subject: { fontSize: 16, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  muted: { color: '#6b7280' },
  error: { color: '#b91c1c' }
});
