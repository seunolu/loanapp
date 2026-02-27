import React from 'react';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  onlineManager
} from '@tanstack/react-query';
import { getUserFacingErrorMessage, isNetworkError, isUnauthorized } from '../lib/errors';
import { showToast } from '../ui/feedback/toast-store';

type GlobalErrorMeta = {
  suppressGlobalErrorToast?: boolean;
};

type NetInfoStateLike = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

type NetInfoModuleLike = {
  addEventListener: (listener: (state: NetInfoStateLike) => void) => () => void;
};

function loadNetInfo(): NetInfoModuleLike | null {
  try {
    const module = require('@react-native-community/netinfo') as {
      default?: NetInfoModuleLike;
      addEventListener?: NetInfoModuleLike['addEventListener'];
    };
    return module.default ?? { addEventListener: module.addEventListener as NetInfoModuleLike['addEventListener'] };
  } catch {
    return null;
  }
}

function getRetryCount(error: unknown): number {
  if (isNetworkError(error)) {
    return 2;
  }
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') {
      if ((status >= 400 && status < 500 && status !== 408 && status !== 429) || status === 401 || status === 403) {
        return 0;
      }
      if (status === 408 || status === 429 || status >= 500) {
        return 2;
      }
    }
  }
  return 0;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const meta = (query.meta ?? {}) as GlobalErrorMeta;
      if (meta.suppressGlobalErrorToast || isUnauthorized(error)) {
        return;
      }
      // Background refresh failures are handled inline by screens.
      if (query.state.data !== undefined) {
        return;
      }
      showToast({
        type: 'error',
        title: 'Request failed',
        message: getUserFacingErrorMessage(error)
      });
    }
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const meta = (mutation.meta ?? {}) as GlobalErrorMeta;
      if (meta.suppressGlobalErrorToast || isUnauthorized(error)) {
        return;
      }
      showToast({
        type: 'error',
        title: 'Action failed',
        message: getUserFacingErrorMessage(error)
      });
    }
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < getRetryCount(error),
      retryDelay: (attempt) => Math.min(500 * 2 ** Math.max(0, attempt - 1), 3000),
      staleTime: 30_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true
    },
    mutations: {
      retry: 0
    }
  }
});

onlineManager.setEventListener((setOnline) => {
  const netInfo = loadNetInfo();
  if (!netInfo) {
    return undefined;
  }
  return netInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
});

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
