import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { loadTenantConfig, type TenantPublicConfig } from '../src/lib/api';

export default function TenantScreen() {
  const [slug, setSlug] = useState('');
  const [tenant, setTenant] = useState<TenantPublicConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookupMutation = useMutation({
    mutationFn: async (nextSlug: string) => loadTenantConfig(nextSlug.trim().toLowerCase()),
    onSuccess: (config) => {
      setTenant(config);
      setError(null);
    },
    onError: (e) => {
      setTenant(null);
      setError(e instanceof Error ? e.message : 'Failed to load tenant.');
    }
  });

  const onLookup = () => {
    if (!slug.trim()) {
      setError('Enter lender slug.');
      return;
    }
    lookupMutation.mutate(slug);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Select Lender</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={setSlug}
          placeholder="e.g. acme"
          style={styles.input}
          value={slug}
        />
        <Pressable onPress={onLookup} style={styles.button}>
          {lookupMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Load Tenant</Text>}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {tenant ? (
          <View style={styles.preview}>
            <View style={[styles.colorChip, { backgroundColor: tenant.branding.primaryColor }]} />
            <Text style={styles.previewTitle}>{tenant.branding.displayName}</Text>
            {tenant.branding.logoUrl ? <Image source={{ uri: tenant.branding.logoUrl }} style={styles.logo} /> : null}
            <Pressable onPress={() => router.push('/auth/login')} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Continue to Login</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#0b1720' },
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
  error: { color: '#b91c1c' },
  preview: { marginTop: 20, backgroundColor: '#fff', borderRadius: 10, padding: 16, gap: 8 },
  colorChip: { width: 32, height: 32, borderRadius: 999 },
  previewTitle: { fontSize: 18, fontWeight: '700', color: '#0b1720' },
  logo: { width: 120, height: 120, resizeMode: 'contain' },
  secondaryButton: { marginTop: 8, backgroundColor: '#1f6b5a', borderRadius: 8, padding: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#fff', fontWeight: '600' }
});
