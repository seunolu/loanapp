import baseConfigJson from './app.json';
import matrix from './branding.matrix.json';

type BrandKey = keyof typeof matrix;

function resolveBrandKey(): BrandKey {
  const raw = (process.env.BRAND || process.env.APP_BRAND || 'default').trim().toLowerCase();
  return (raw in matrix ? raw : 'default') as BrandKey;
}

type BaseExpo = typeof baseConfigJson.expo & {
  extra?: Record<string, unknown>;
  android?: (typeof baseConfigJson.expo.android & { adaptiveIcon?: { backgroundColor?: string } });
  ios?: typeof baseConfigJson.expo.ios & { bundleIdentifier?: string };
};

export default ({ config }: { config: Record<string, unknown> }) => {
  const base = baseConfigJson.expo as BaseExpo;
  const brandKey = resolveBrandKey();
  const selected = matrix[brandKey];
  const icon = `./assets/brands/${brandKey}/icon.png`;
  const splashImage = `./assets/brands/${brandKey}/splash.png`;

  return {
    ...config,
    ...base,
    name: selected.name,
    slug: selected.slug,
    scheme: selected.scheme,
    icon,
    splash: {
      image: splashImage,
      backgroundColor: selected.adaptiveIconBackground || '#ffffff',
      resizeMode: 'contain'
    },
    android: {
      ...(base.android || {}),
      package: selected.androidPackage,
      adaptiveIcon: {
        ...((base.android && base.android.adaptiveIcon) || {}),
        foregroundImage: icon,
        backgroundColor: selected.adaptiveIconBackground || '#ffffff'
      }
    },
    ios: {
      ...(base.ios || {}),
      bundleIdentifier: selected.iosBundleIdentifier
    },
    extra: {
      ...(base.extra || {}),
      appBrand: brandKey,
      defaultTenantSlug: selected.defaultTenantSlug
    }
  };
};
