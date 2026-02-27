import 'react-native-gesture-handler';
import * as React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrapApp } from '../src/bootstrap/bootstrap';
import { subscribeSessionExpired } from '../src/auth/session-events';
import { ErrorBoundary } from '../src/errors/ErrorBoundary';
import { RootErrorScreen } from '../src/errors/RootErrorScreen';
import { AuthProvider, useAuth } from '../src/providers/auth-provider';
import { KycProvider } from '../src/providers/kyc-provider';
import { AppQueryProvider } from '../src/providers/query-provider';
import { TenantProvider } from '../src/tenant/tenant-context';
import { AppLoading, ThemeProvider, Toast } from '../src/ui';

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

function AuthRouteGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { status } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [showSessionExpired, setShowSessionExpired] = React.useState(false);
  const hasHandledRedirect = React.useRef<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = subscribeSessionExpired(() => {
      setShowSessionExpired(true);
      router.replace('/(auth)/login');
    });
    return unsubscribe;
  }, [router]);

  React.useEffect(() => {
    if (status === 'unknown') {
      return;
    }

    const currentRoot = segments[0] ?? '';
    const isProtected = currentRoot === '(app)';
    const isAuthGroup = currentRoot === '(auth)' || currentRoot === 'auth';
    const redirectKey = `${status}:${currentRoot}`;

    if (hasHandledRedirect.current === redirectKey) {
      return;
    }

    if (status === 'unauthenticated' && isProtected) {
      hasHandledRedirect.current = redirectKey;
      router.replace('/(auth)/login');
      return;
    }

    if (status === 'authenticated' && isAuthGroup) {
      hasHandledRedirect.current = redirectKey;
      router.replace('/(app)/home');
      return;
    }

    hasHandledRedirect.current = null;
  }, [router, segments, status]);

  if (status === 'unknown') {
    return <AppLoading />;
  }

  return (
    <View style={styles.routeContainer}>
      {children}
      <View style={styles.toastContainer} pointerEvents="box-none">
        <Toast
          visible={showSessionExpired}
          message="Session expired. Please sign in again."
          tone="warning"
          onHide={() => setShowSessionExpired(false)}
        />
      </View>
    </View>
  );
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
                    <AuthRouteGate>
                      <StatusBar style="dark" />
                      <Stack screenOptions={{ headerShown: false }} />
                    </AuthRouteGate>
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

const styles = StyleSheet.create({
  routeContainer: {
    flex: 1
  },
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24
  }
});
