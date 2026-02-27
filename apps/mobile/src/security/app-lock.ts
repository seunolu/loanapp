import * as SecureStore from 'expo-secure-store';

const APP_LOCK_KEY = 'loanapp.mobile.security.appLockEnabled';

export async function getAppLockEnabled(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(APP_LOCK_KEY);
  return stored === '1';
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(APP_LOCK_KEY, '1');
    return;
  }
  await SecureStore.deleteItemAsync(APP_LOCK_KEY);
}

type LocalAuthModule = {
  hasHardwareAsync: () => Promise<boolean>;
  isEnrolledAsync: () => Promise<boolean>;
  authenticateAsync: (options: {
    promptMessage: string;
    cancelLabel?: string;
    fallbackLabel?: string;
    disableDeviceFallback?: boolean;
  }) => Promise<{ success: boolean }>;
};

function getLocalAuthModule(): LocalAuthModule | null {
  try {
    return require('expo-local-authentication') as LocalAuthModule;
  } catch {
    return null;
  }
}

export async function requestAppUnlock(): Promise<boolean> {
  const LocalAuth = getLocalAuthModule();
  if (!LocalAuth) {
    return true;
  }

  const [hasHardware, enrolled] = await Promise.all([LocalAuth.hasHardwareAsync(), LocalAuth.isEnrolledAsync()]);
  if (!hasHardware || !enrolled) {
    return false;
  }

  const result = await LocalAuth.authenticateAsync({
    promptMessage: 'Unlock LoanApp',
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use passcode'
  });
  return Boolean(result.success);
}

