import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/providers/auth-provider';
import { KycProvider } from '../src/providers/kyc-provider';
import { AppQueryProvider } from '../src/providers/query-provider';
import { TenantProvider } from '../src/tenant/tenant-context';
import { ThemeProvider } from '../src/ui';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppQueryProvider>
            <AuthProvider>
              <TenantProvider>
                <KycProvider>
                  <StatusBar style="dark" />
                  <Stack screenOptions={{ headerShown: false }} />
                </KycProvider>
              </TenantProvider>
            </AuthProvider>
          </AppQueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
