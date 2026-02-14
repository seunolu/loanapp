import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { getMe, getSelectedTenantConfig, logout } from '../../src/lib/api';

export default function HomeScreen() {
  const meQuery = useQuery({
    queryKey: ['session', 'me'],
    queryFn: () => getMe()
  });
  const tenantQuery = useQuery({
    queryKey: ['tenant', 'selected'],
    queryFn: () => getSelectedTenantConfig()
  });

  const displayName =
    meQuery.data?.profile?.firstName && meQuery.data.profile?.lastName
      ? `${meQuery.data.profile.firstName} ${meQuery.data.profile.lastName}`
      : meQuery.data?.phone ?? 'Borrower';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.value}>{displayName}</Text>
        <Text style={styles.label}>Lender</Text>
        <Text style={styles.value}>{tenantQuery.data?.branding.displayName ?? '-'}</Text>
        <Pressable
          onPress={async () => {
            await logout();
            router.replace('/auth/login');
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f8' },
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#0b1720' },
  label: { color: '#4b5563' },
  value: { fontSize: 18, fontWeight: '600', color: '#0b1720' },
  button: { marginTop: 12, backgroundColor: '#0b1720', borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' }
});
