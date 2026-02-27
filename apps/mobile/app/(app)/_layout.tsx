import { Redirect, Tabs } from 'expo-router';
import { colors } from '../../src/ui';
import { useAuth } from '../../src/providers/auth-provider';

export default function AppLayout() {
  const { isAuthed, isLoading } = useAuth();
  if (!isLoading && !isAuthed) {
    return <Redirect href={'/welcome' as any} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8
        }
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="loans" options={{ title: 'Loans' }} />
      <Tabs.Screen name="repay" options={{ title: 'Repay' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="apply" options={{ href: null }} />
      <Tabs.Screen name="loan" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="hardship" options={{ href: null }} />
    </Tabs>
  );
}


