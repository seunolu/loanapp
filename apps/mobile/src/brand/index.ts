import Constants from 'expo-constants';
import { acmeBrand } from './brands/acme';
import { defaultBrand } from './brands/default';
import { demoBrand } from './brands/demo';
import type { BrandKey, BrandTokens } from './types';

const registry: Record<BrandKey, BrandTokens> = {
  default: defaultBrand,
  demo: demoBrand,
  acme: acmeBrand
};

function resolveBrandKey(): BrandKey {
  const fromCompileTime = (process.env.BRAND || process.env.APP_BRAND || '').trim().toLowerCase();
  if (fromCompileTime in registry) {
    return fromCompileTime as BrandKey;
  }

  const fromExpoExtra = (Constants.expoConfig?.extra?.appBrand || '').toString().trim().toLowerCase();
  if (fromExpoExtra in registry) {
    return fromExpoExtra as BrandKey;
  }

  return 'default';
}

export const activeBrandKey = resolveBrandKey();
export const brand = registry[activeBrandKey];

export function getBrand(key?: string): BrandTokens {
  if (!key) {
    return brand;
  }
  const normalized = key.trim().toLowerCase();
  return registry[(normalized in registry ? normalized : 'default') as BrandKey];
}

export { registry as brands };
export type { BrandKey, BrandTokens } from './types';
