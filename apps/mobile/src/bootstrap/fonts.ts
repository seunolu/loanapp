import { Platform } from 'react-native';

export const defaultFontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System'
});

export async function loadFonts(): Promise<void> {
  let fontModule: { loadAsync: (fontMap: Record<string, number>) => Promise<void> } | null = null;
  try {
    fontModule = require('expo-font') as { loadAsync: (fontMap: Record<string, number>) => Promise<void> };
  } catch {
    fontModule = null;
  }

  if (!fontModule) {
    return;
  }

  // Extend this map when branded font assets are added.
  await fontModule.loadAsync({});
}
