import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearTokens, getTokens, setTokens, type SessionTokens } from '../auth/token-storage';

const TENANT_SLUG_KEY = 'loanapp.mobile.tenant.slug';
const DEVICE_ID_KEY = 'loanapp.mobile.device.id';
const ONBOARDING_SEEN_KEY = 'loanapp.mobile.onboarding.seen';

export async function getTenantSlug(): Promise<string | null> {
  return AsyncStorage.getItem(TENANT_SLUG_KEY);
}

export async function setTenantSlug(slug: string): Promise<void> {
  await AsyncStorage.setItem(TENANT_SLUG_KEY, slug);
}

export async function clearTenantSlug(): Promise<void> {
  await AsyncStorage.removeItem(TENANT_SLUG_KEY);
}

export async function getDeviceId(): Promise<string | null> {
  return AsyncStorage.getItem(DEVICE_ID_KEY);
}

export async function setDeviceId(deviceId: string): Promise<void> {
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
}

export async function clearDeviceId(): Promise<void> {
  await AsyncStorage.removeItem(DEVICE_ID_KEY);
}

export async function getOnboardingSeen(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
  return value === 'true';
}

export async function setOnboardingSeen(seen = true): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, seen ? 'true' : 'false');
}

export async function clearOnboardingSeen(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_SEEN_KEY);
}

export async function getSessionTokens(): Promise<SessionTokens | null> {
  return getTokens();
}

export async function setSessionTokens(tokens: SessionTokens): Promise<void> {
  await setTokens(tokens);
}

export async function clearSessionTokens(): Promise<void> {
  await clearTokens();
}

export async function clearLocalAppState(): Promise<void> {
  await Promise.all([
    clearTokens(),
    AsyncStorage.removeItem(TENANT_SLUG_KEY),
    AsyncStorage.removeItem(DEVICE_ID_KEY),
    AsyncStorage.removeItem(ONBOARDING_SEEN_KEY)
  ]);
}
