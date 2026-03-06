import { Redirect, Tabs, useSegments } from 'expo-router';
import { useAuth } from '../../src/providers/auth-provider';
import { colors } from '../../src/ui';

const VISIBLE_TABS = new Set(['home', 'loans', 'repay', 'transactions', 'profile']);

export default function AppLayout() {
  const { status } = useAuth();
  const segments = useSegments();

  if (status === 'unauthenticated') {
    return <Redirect href={'/login' as any} />;
  }

  const currentRoot = segments[1] ?? '';
  const hideTabBar = segments.length > 2 || (segments[0] === '(app)' && currentRoot !== '' && !VISIBLE_TABS.has(currentRoot));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            height: 64,
            paddingBottom: 8,
            paddingTop: 8
          },
          hideTabBar ? { display: 'none' } : null
        ]
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="loans" options={{ title: 'Loans' }} />
      <Tabs.Screen name="repay" options={{ title: 'Repay' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="apply" options={{ href: null }} />
      <Tabs.Screen name="loan" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="hardship" options={{ href: null }} />
      <Tabs.Screen name="maintenance" options={{ href: null }} />
      <Tabs.Screen name="session-expired" options={{ href: null }} />
      <Tabs.Screen name="offline" options={{ href: null }} />
    </Tabs>
  );
}