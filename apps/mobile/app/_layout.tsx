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
import { REQUIRE_TENANT_SELECTION, ROUTE_GROUPS, ROUTES } from '../src/routing/guards';
import { useTenant } from '../src/tenant/tenant-context';
import { FullScreenLoader, ThemeProvider, Toast } from '../src/ui';

type SplashModule = {
  preventAutoHideAsync: () => Promise<boolean>;
  hideAsync: () => Promise<void>;
};

function getSplashModule(): SplashModule | null {
  try {
    return require('expo-splash-screen') as SplashModule;
  } catch {
    return null;
  }
}

const splash = getSplashModule();
void splash?.preventAutoHideAsync().catch(() => undefined);

type BootstrapState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; error: unknown };

function BootstrapGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<BootstrapState>({ phase: 'loading' });
  const isSplashHiddenRef = React.useRef(false);

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

  React.useEffect(() => {
    if (state.phase !== 'error' || isSplashHiddenRef.current) {
      return;
    }
    requestAnimationFrame(() => {
      void splash?.hideAsync()
        .catch(() => undefined)
        .finally(() => {
          isSplashHiddenRef.current = true;
        });
    });
  }, [state.phase]);

  if (state.phase === 'loading') {
    return <FullScreenLoader message="Preparing your workspace..." />;
  }
  if (state.phase === 'error') {
    return <RootErrorScreen error={state.error} onRetry={retry} />;
  }

  return <ErrorBoundary onRetry={retry}>{children}</ErrorBoundary>;
}

function AuthRouteGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { status } = useAuth();
  const { tenantSlug, resolved } = useTenant();
  const router = useRouter();
  const segments = useSegments();
  const [showSessionExpired, setShowSessionExpired] = React.useState(false);
  const hasHandledRedirect = React.useRef<string | null>(null);
  const hasHiddenNativeSplash = React.useRef(false);

  React.useEffect(() => {
    const unsubscribe = subscribeSessionExpired(() => {
      setShowSessionExpired(true);
      router.replace('/(auth)/login');
    });
    return unsubscribe;
  }, [router]);

  React.useEffect(() => {
    if (status === 'unknown' || hasHiddenNativeSplash.current) {
      return;
    }

    requestAnimationFrame(() => {
      void splash?.hideAsync()
        .catch(() => undefined)
        .finally(() => {
          hasHiddenNativeSplash.current = true;
        });
    });
  }, [status]);

  React.useEffect(() => {
    if (status === 'unknown') {
      return;
    }

    const currentRoot = segments[0] ?? '';
    const inTenantScreen = currentRoot === 'tenant';
    const isProtected = currentRoot === ROUTE_GROUPS.app;
    const isAuthGroup = currentRoot === ROUTE_GROUPS.auth || currentRoot === 'auth';
    const requiresTenantSelection = REQUIRE_TENANT_SELECTION && status === 'authenticated' && !tenantSlug && resolved;
    const redirectKey = `${status}:${currentRoot}:${tenantSlug}:${resolved}`;

    if (hasHandledRedirect.current === redirectKey) {
      return;
    }

    if (status === 'unauthenticated' && isProtected) {
      hasHandledRedirect.current = redirectKey;
      router.replace(ROUTES.authLogin);
      return;
    }

    if (status === 'authenticated' && isAuthGroup) {
      hasHandledRedirect.current = redirectKey;
      router.replace(ROUTES.authLanding);
      return;
    }

    if (requiresTenantSelection && !inTenantScreen) {
      hasHandledRedirect.current = redirectKey;
      router.replace(ROUTES.tenant);
      return;
    }

    hasHandledRedirect.current = null;
  }, [resolved, router, segments, status, tenantSlug]);

  if (status === 'unknown') {
    return <FullScreenLoader message="Preparing your workspace..." />;
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
