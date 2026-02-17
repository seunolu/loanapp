import { Platform } from 'react-native';

const DEV_DEFAULT_API_BASE_URL = 'http://10.0.2.2:3000';
const ANDROID_EMULATOR_FALLBACK_API_BASE_URL = 'http://10.0.2.2:3000';

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (override) {
    return trimTrailingSlashes(override);
  }

  if (__DEV__ && Platform.OS === 'android') {
    return DEV_DEFAULT_API_BASE_URL;
  }

  return DEV_DEFAULT_API_BASE_URL;
}

export function getApiBaseUrlCandidates(): string[] {
  const primary = getApiBaseUrl();
  const hasExplicitOverride = Boolean(process.env.EXPO_PUBLIC_API_BASE_URL?.trim());

  if (!hasExplicitOverride && __DEV__ && Platform.OS === 'android' && primary !== ANDROID_EMULATOR_FALLBACK_API_BASE_URL) {
    return [primary, ANDROID_EMULATOR_FALLBACK_API_BASE_URL];
  }

  return [primary];
}
