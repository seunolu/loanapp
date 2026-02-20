'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';

import { AuthProvider as SessionAuthProvider } from '@/components/auth/auth-context';
import { AppToaster } from '@/components/ui/toaster';
import { EnvRuntimeLog } from '@/src/components/env-runtime-log';
import { AuthProvider as TokenAuthProvider } from '@/src/providers/auth-provider';
import { TenantProvider } from '@/src/providers/tenant-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TokenAuthProvider>
          <TenantProvider>
            <SessionAuthProvider>
              <EnvRuntimeLog />
              {children}
              <AppToaster />
            </SessionAuthProvider>
          </TenantProvider>
        </TokenAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
