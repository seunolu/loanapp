import { brand } from '../brand';
import { ConfigError } from '../errors/AppError';
import { getApiBaseUrl } from '../lib/apiBaseUrl';

export type RuntimeConfig = {
  brandKey: string;
  appName: string;
  apiBaseUrl: string;
  supportEmail: string;
};

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) {
    throw new ConfigError(`Missing required runtime config: ${field}`);
  }
}

export function assertRuntimeConfig(): RuntimeConfig {
  const apiBaseUrl = getApiBaseUrl().trim();
  assertNonEmpty(apiBaseUrl, 'EXPO_PUBLIC_API_BASE_URL');
  assertNonEmpty(brand.appName, 'brand.appName');
  assertNonEmpty(brand.supportEmail, 'brand.supportEmail');

  if (!brand.logo || !brand.splash) {
    throw new ConfigError('Brand assets are not configured correctly.');
  }

  return {
    brandKey: brand.key,
    appName: brand.appName,
    apiBaseUrl,
    supportEmail: brand.supportEmail
  };
}

