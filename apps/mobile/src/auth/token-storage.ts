import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'loanapp.mobile.auth.accessToken';
const REFRESH_TOKEN_KEY = 'loanapp.mobile.auth.refreshToken';
const ACCESS_TOKEN_FALLBACK_KEY = `${ACCESS_TOKEN_KEY}.fallback`;
const REFRESH_TOKEN_FALLBACK_KEY = `${REFRESH_TOKEN_KEY}.fallback`;

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

let secureStoreAvailable: boolean | null = null;

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

export async function getTokens(): Promise<SessionTokens | null> {
  if (await canUseSecureStore()) {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    ]);
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
  }

  const [accessTokenFallback, refreshTokenFallback] = await Promise.all([
    AsyncStorage.getItem(ACCESS_TOKEN_FALLBACK_KEY),
    AsyncStorage.getItem(REFRESH_TOKEN_FALLBACK_KEY)
  ]);
  if (!accessTokenFallback || !refreshTokenFallback) {
    return null;
  }
  return {
    accessToken: accessTokenFallback,
    refreshToken: refreshTokenFallback
  };
}

export async function setTokens(tokens: SessionTokens): Promise<void> {
  if (await canUseSecureStore()) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken)
    ]);
    await Promise.all([
      AsyncStorage.removeItem(ACCESS_TOKEN_FALLBACK_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_FALLBACK_KEY)
    ]);
    return;
  }

  await Promise.all([
    AsyncStorage.setItem(ACCESS_TOKEN_FALLBACK_KEY, tokens.accessToken),
    AsyncStorage.setItem(REFRESH_TOKEN_FALLBACK_KEY, tokens.refreshToken)
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(ACCESS_TOKEN_FALLBACK_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_FALLBACK_KEY)
  ]);
}

