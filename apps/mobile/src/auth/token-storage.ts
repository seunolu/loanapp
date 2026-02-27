import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'loanapp.mobile.auth.accessToken';
const REFRESH_TOKEN_KEY = 'loanapp.mobile.auth.refreshToken';
const TOKEN_TENANT_BINDING_KEY = 'loanapp.mobile.auth.tenantBinding';
const ACCESS_TOKEN_FALLBACK_KEY = `${ACCESS_TOKEN_KEY}.fallback`;
const REFRESH_TOKEN_FALLBACK_KEY = `${REFRESH_TOKEN_KEY}.fallback`;
const LEGACY_MIGRATION_KEY = 'loanapp.mobile.auth.migratedToSecureStore';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

let secureStoreAvailable: boolean | null = null;
let migrationPromise: Promise<void> | null = null;

async function canUseSecureStore(): Promise<boolean> {
  if (secureStoreAvailable !== null) {
    return secureStoreAvailable;
  }
  try {
    secureStoreAvailable = await SecureStore.isAvailableAsync();
  } catch {
    secureStoreAvailable = false;
  }
  return secureStoreAvailable;
}

async function assertSecureStoreAvailable(): Promise<void> {
  if (!(await canUseSecureStore())) {
    throw new Error('Secure token storage is unavailable on this device.');
  }
}

async function migrateLegacyFallbackTokens(): Promise<void> {
  await assertSecureStoreAvailable();

  const migrationDone = await AsyncStorage.getItem(LEGACY_MIGRATION_KEY);
  if (migrationDone === '1') {
    return;
  }

  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  ]);

  if (!accessToken || !refreshToken) {
    const [legacyAccessToken, legacyRefreshToken] = await Promise.all([
      AsyncStorage.getItem(ACCESS_TOKEN_FALLBACK_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_FALLBACK_KEY)
    ]);
    if (legacyAccessToken && legacyRefreshToken) {
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacyAccessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, legacyRefreshToken)
      ]);
    }
  }

  await Promise.all([
    AsyncStorage.removeItem(ACCESS_TOKEN_FALLBACK_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_FALLBACK_KEY),
    AsyncStorage.setItem(LEGACY_MIGRATION_KEY, '1')
  ]);
}

async function ensureLegacyMigration(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = migrateLegacyFallbackTokens().finally(() => {
      migrationPromise = null;
    });
  }
  await migrationPromise;
}

export async function getTokens(): Promise<SessionTokens | null> {
  await ensureLegacyMigration();
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  ]);
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

export async function setTokens(tokens: SessionTokens): Promise<void> {
  await assertSecureStoreAvailable();
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
    AsyncStorage.removeItem(ACCESS_TOKEN_FALLBACK_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_FALLBACK_KEY)
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(TOKEN_TENANT_BINDING_KEY),
    AsyncStorage.removeItem(ACCESS_TOKEN_FALLBACK_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_FALLBACK_KEY)
  ]);
}

export async function getTokenTenantBinding(): Promise<string | null> {
  await assertSecureStoreAvailable();
  return SecureStore.getItemAsync(TOKEN_TENANT_BINDING_KEY);
}

export async function setTokenTenantBinding(tenantSlug: string): Promise<void> {
  await assertSecureStoreAvailable();
  await SecureStore.setItemAsync(TOKEN_TENANT_BINDING_KEY, tenantSlug.trim().toLowerCase());
}

export async function clearTokenTenantBinding(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_TENANT_BINDING_KEY);
}
