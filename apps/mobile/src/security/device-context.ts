import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ClientContext = {
  appVersion: string;
  platform: 'ios' | 'android';
};

function resolveNativeVersion(): string | null {
  const expoConfigVersion = Constants.expoConfig?.version;
  if (expoConfigVersion) {
    return expoConfigVersion;
  }
  const config = Constants as unknown as { nativeAppVersion?: string };
  return typeof config.nativeAppVersion === 'string' ? config.nativeAppVersion : null;
}

export function getClientContext(): ClientContext {
  return {
    appVersion: resolveNativeVersion() ?? 'dev',
    platform: Platform.OS === 'ios' ? 'ios' : 'android'
  };
}

