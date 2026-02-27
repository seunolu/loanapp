import 'react-native-gesture-handler';
import * as React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrapApp } from '../src/bootstrap/bootstrap';
import { ErrorBoundary } from '../src/errors/ErrorBoundary';
import { RootErrorScreen } from '../src/errors/RootErrorScreen';
import { AuthProvider } from '../src/providers/auth-provider';
import { KycProvider } from '../src/providers/kyc-provider';
import { AppQueryProvider } from '../src/providers/query-provider';
import { TenantProvider } from '../src/tenant/tenant-context';
import { AppLoading, ThemeProvider } from '../src/ui';

type BootstrapState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; error: unknown };

function BootstrapGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<BootstrapState>({ phase: 'loading' });

  React.useEffect(() => {
    let active = true;
    setState({ phase: 'loading' });

    bootstrapApp()
      .then(() => {
        if (active) {
          setState({ phase: 'ready' });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ phase: 'error', error });
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = React.useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  if (state.phase === 'loading') {
    return <AppLoading />;
  }
  if (state.phase === 'error') {
    return <RootErrorScreen error={state.error} onRetry={retry} />;
  }

  return <ErrorBoundary onRetry={retry}>{children}</ErrorBoundary>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BootstrapGate>
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
          </BootstrapGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
