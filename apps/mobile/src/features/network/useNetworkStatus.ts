import * as React from 'react';
type NetInfoStateLike = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

type NetInfoModuleLike = {
  addEventListener: (listener: (state: NetInfoStateLike) => void) => () => void;
  fetch: () => Promise<NetInfoStateLike>;
};

function loadNetInfo(): NetInfoModuleLike | null {
  try {
    const module = require('@react-native-community/netinfo') as {
      default?: NetInfoModuleLike;
      addEventListener?: NetInfoModuleLike['addEventListener'];
      fetch?: NetInfoModuleLike['fetch'];
    };
    return module.default ?? {
      addEventListener: module.addEventListener as NetInfoModuleLike['addEventListener'],
      fetch: module.fetch as NetInfoModuleLike['fetch']
    };
  } catch {
    return null;
  }
}

function isOfflineState(state: NetInfoStateLike): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

export function useNetworkStatus() {
  const [state, setState] = React.useState(() => ({
    isConnected: true,
    isInternetReachable: true,
    isOffline: false,
    hasResolved: false
  }));

  React.useEffect(() => {
    const netInfo = loadNetInfo();
    if (!netInfo) {
      setState((prev) => ({ ...prev, hasResolved: true }));
      return;
    }

    let active = true;
    const unsubscribe = netInfo.addEventListener((next) => {
      if (!active) {
        return;
      }
      setState({
        isConnected: next.isConnected ?? false,
        isInternetReachable: next.isInternetReachable ?? true,
        isOffline: isOfflineState(next),
        hasResolved: true
      });
    });

    void netInfo.fetch().then((next) => {
      if (!active) {
        return;
      }
      setState({
        isConnected: next.isConnected ?? false,
        isInternetReachable: next.isInternetReachable ?? true,
        isOffline: isOfflineState(next),
        hasResolved: true
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}
