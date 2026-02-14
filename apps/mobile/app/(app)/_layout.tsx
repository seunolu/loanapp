import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { getSelectedTenantConfig, hasActiveSession } from '../../src/lib/api';

export default function AppLayout() {
  const sessionQuery = useQuery({
    queryKey: ['session', 'exists'],
    queryFn: () => hasActiveSession()
  });
  const tenantQuery = useQuery({
    queryKey: ['tenant', 'selected'],
    queryFn: () => getSelectedTenantConfig(),
    retry: false
  });

  if (sessionQuery.isLoading || tenantQuery.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!tenantQuery.data) {
    return <Redirect href="/tenant" />;
  }

  if (!sessionQuery.data) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="apply" options={{ title: 'Apply' }} />
      <Tabs.Screen name="loan" options={{ title: 'Loan' }} />
      <Tabs.Screen name="repay" options={{ title: 'Repay' }} />
    </Tabs>
  );
}
