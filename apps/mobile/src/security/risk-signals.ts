import Constants from 'expo-constants';

export type RiskSignals = {
  isDevBuild: boolean;
  isExpoGo: boolean;
  isLikelyEmulator: boolean;
  isDebuggerLikelyAttached: boolean;
};

export function collectRiskSignals(): RiskSignals {
  const host = typeof Constants.expoConfig?.hostUri === 'string' ? Constants.expoConfig.hostUri.toLowerCase() : '';
  const executionEnvironment = String((Constants as unknown as { executionEnvironment?: string }).executionEnvironment ?? '')
    .toLowerCase();
  const isExpoGo = executionEnvironment.includes('storeclient') || Constants.appOwnership === 'expo';
  const isLikelyEmulator = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('10.0.2.2');
  const isDebuggerLikelyAttached = __DEV__ && typeof (globalThis as { HermesInternal?: unknown }).HermesInternal === 'undefined';

  return {
    isDevBuild: __DEV__,
    isExpoGo,
    isLikelyEmulator,
    isDebuggerLikelyAttached
  };
}

