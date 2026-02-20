import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getApiBaseUrl } from '../src/lib/apiBaseUrl';
import { apiGet } from '../src/lib/http';

type HealthResponse = {
  status: 'ok' | 'degraded';
  version: string;
  database: {
    status: 'up' | 'down';
  };
};

export default function HealthScreen() {
  const baseUrl = getApiBaseUrl();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePing(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const payload = await apiGet<HealthResponse>('/health');
      setResult(payload);
    } catch (requestError) {
      setResult(null);
      setError(requestError instanceof Error ? requestError.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Health Check</Text>
        <Text style={styles.label}>Current API Base URL</Text>
        <Text style={styles.value}>{baseUrl}</Text>

        <Pressable onPress={handlePing} style={styles.button} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Pinging...' : 'Ping /health'}</Text>
        </Pressable>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {result ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Result</Text>
            <Text selectable style={styles.resultText}>
              {JSON.stringify(result, null, 2)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  container: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#0b1720' },
  label: { color: '#4b5563', fontWeight: '600' },
  value: { fontSize: 16, color: '#0b1720' },
  button: {
    marginTop: 8,
    backgroundColor: '#0b1720',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  errorBox: { marginTop: 8, borderRadius: 8, backgroundColor: '#fee2e2', padding: 12 },
  errorTitle: { color: '#991b1b', fontWeight: '700', marginBottom: 4 },
  errorText: { color: '#7f1d1d' },
  resultBox: { marginTop: 8, borderRadius: 8, backgroundColor: '#e2e8f0', padding: 12 },
  resultTitle: { color: '#0f172a', fontWeight: '700', marginBottom: 4 },
  resultText: { color: '#0f172a', fontFamily: 'monospace' }
});
