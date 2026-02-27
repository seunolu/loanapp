import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TENANT_SLUG_KEY = 'loanapp.mobile.tenant.slug';
const DEVICE_ID_KEY = 'loanapp.mobile.device.id';
const ACCESS_TOKEN_KEY = 'loanapp.mobile.auth.accessToken';
const REFRESH_TOKEN_KEY = 'loanapp.mobile.auth.refreshToken';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

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

export async function getSessionTokens(): Promise<SessionTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  ]);
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

export async function setSessionTokens(tokens: SessionTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken)
  ]);
}

export async function clearSessionTokens(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
}

export async function clearLocalAppState(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(TENANT_SLUG_KEY),
    AsyncStorage.removeItem(DEVICE_ID_KEY)
  ]);
}
