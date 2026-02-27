import { Image } from 'react-native';
import { brand } from '../brand';
import { AppError } from '../errors/AppError';
import { hydrateAuth } from '../providers/auth-provider';
import { hydrateTenant } from '../tenant/tenant-context';
import { loadFonts } from './fonts';
import { assertRuntimeConfig } from './runtime-config';

function logDev(message: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[bootstrap] ${message}`);
  }
}

async function preloadBrandAssets(): Promise<void> {
  const assets = [brand.logo, brand.splash];
  await Promise.all(
    assets.map(async (assetModule) => {
      const source = Image.resolveAssetSource(assetModule);
      if (source?.uri) {
        await Image.prefetch(source.uri);
      }
    })
  );
}

function normalizeBootstrapError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    return new AppError(error.message, 'BOOTSTRAP_ERROR', error);
  }
  return new AppError('Bootstrap failed for an unknown reason.', 'BOOTSTRAP_ERROR', error);
}

export async function bootstrapApp(): Promise<{ ready: true }> {
  try {
    logDev('loading fonts');
    await loadFonts();
    logDev('hydrating auth + tenant');
    await Promise.all([hydrateAuth(), hydrateTenant()]);
    logDev('validating runtime config');
    assertRuntimeConfig();
    logDev('preloading brand assets');
    await preloadBrandAssets();
    return { ready: true };
  } catch (error: unknown) {
    throw normalizeBootstrapError(error);
  }
}

