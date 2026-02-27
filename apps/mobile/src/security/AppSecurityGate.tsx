import * as React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import { getAppLockEnabled, requestAppUnlock } from './app-lock';
import { MaintenanceOverlay } from './MaintenanceOverlay';
import { collectRiskSignals } from './risk-signals';
import { showToast } from '../ui/feedback/toast-store';

export function AppSecurityGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [locked, setLocked] = React.useState(false);
  const appState = React.useRef<AppStateStatus>(AppState.currentState);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = AppState.addEventListener('change', (nextState) => {
      const movedToForeground = appState.current.match(/inactive|background/) && nextState === 'active';
      appState.current = nextState;
      if (!movedToForeground) {
        return;
      }
      void (async () => {
        const enabled = await getAppLockEnabled();
        if (!enabled) {
          return;
        }
        const success = await requestAppUnlock();
        if (!success) {
          setLocked(true);
          router.replace('/(auth)/login');
          showToast({ type: 'error', title: 'App unlock failed', message: 'Please sign in again.' });
        }
      })();
    });
    return () => {
      unsubscribe.remove();
    };
  }, [router]);

  React.useEffect(() => {
    const risk = collectRiskSignals();
    if (risk.isLikelyEmulator || risk.isDebuggerLikelyAttached) {
      showToast({
        type: 'info',
        title: 'Security notice',
        message: 'High-risk runtime detected. Some sensitive actions may be limited.'
      });
    }
  }, []);

  return (
    <>
      {locked ? null : children}
      <MaintenanceOverlay />
    </>
  );
}

