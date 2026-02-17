import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiFetch } from '../src/lib/api';
import { setTenantSlug } from '../src/lib/storage';
import { resolveTenant } from '../src/lib/tenant-sdk';
import { DEFAULT_API_BASE_URL, useTenant } from '../src/tenant/tenant-context';

const API_BASE_OVERRIDE = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export default function TenantScreen() {
  const { apiBaseUrl, setTenant, tenantId, tenantSlug } = useTenant();
  const [slug, setSlug] = useState(tenantSlug);
  const [lenderTitleInput, setLenderTitleInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isTestingHealth, setIsTestingHealth] = useState(false);

  const effectiveApiBaseUrl = API_BASE_OVERRIDE || apiBaseUrl || DEFAULT_API_BASE_URL;

  const resolveMutation = useMutation({
    mutationFn: async (nextSlug: string) =>
      resolveTenant({
        apiBaseUrl: effectiveApiBaseUrl,
        slug: nextSlug,
        lenderTitle: lenderTitleInput.trim() || undefined
      }),
    onSuccess: async (payload, nextSlug) => {
      const resolvedSlug = payload.slug?.trim().toLowerCase() || nextSlug;
      const resolvedTenantId = payload.tenantId || payload.id;
      const lenderTitle = payload.lenderTitle || lenderTitleInput.trim() || payload.name;

      setTenant({
        tenantSlug: resolvedSlug,
        tenantId: resolvedTenantId,
        lenderTitle,
        apiBaseUrl: payload.apiBaseUrl || effectiveApiBaseUrl,
        resolved: true
      });
      await setTenantSlug(resolvedSlug);
      setError(null);
      router.replace('/loan-apply');
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'Failed to resolve tenant.');
    }
  });

  const onContinue = () => {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) {
      setError('Enter lender slug.');
      return;
    }
    resolveMutation.mutate(normalizedSlug);
  };

  const onHealthCheck = async () => {
    try {
      setIsTestingHealth(true);
      const result = await apiFetch<Record<string, unknown>>(
        '/health',
        {
          apiBaseUrl: effectiveApiBaseUrl,
          tenantSlug: slug.trim().toLowerCase(),
          tenantId
        },
        { method: 'GET' }
      );
      Alert.alert('Health OK', JSON.stringify(result, null, 2));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Health check failed.';
      Alert.alert('Health Failed', message);
    } finally {
      setIsTestingHealth(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Select Lender</Text>
          <Text style={styles.label}>Lender slug</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setSlug}
            placeholder="e.g. acme"
            style={styles.input}
            value={slug}
          />

          <Text style={styles.label}>Lender title</Text>
          <TextInput
            onChangeText={setLenderTitleInput}
            placeholder="optional lender title (e.g. Demo)"
            style={styles.input}
            value={lenderTitleInput}
          />

          <Pressable disabled={isTestingHealth} onPress={onHealthCheck} style={styles.secondaryButton}>
            {isTestingHealth ? <ActivityIndicator color="#0b1720" /> : <Text style={styles.secondaryButtonText}>Test /health</Text>}
          </Pressable>

          <Pressable disabled={resolveMutation.isPending} onPress={onContinue} style={styles.button}>
            {resolveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
          </Pressable>

          <Text style={styles.hint}>API base: {effectiveApiBaseUrl}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, padding: 20, gap: 12, width: '100%' },
  title: { fontSize: 24, fontWeight: '700', color: '#0b1720' },
  label: { color: '#334155', fontWeight: '600' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#c7d2d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  button: {
    width: '100%',
    backgroundColor: '#0b1720',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  secondaryButton: {
    width: '100%',
    borderColor: '#0b1720',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  secondaryButtonText: { color: '#0b1720', fontWeight: '600' },
  hint: { color: '#64748b', fontSize: 12 },
  error: { color: '#b91c1c' }
});
