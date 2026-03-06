import * as React from 'react';
import { router } from 'expo-router';
import { FullScreenLoader } from '../ui';

export type LegacyQueryParams = Record<string, string | string[] | undefined>;

type LegacyRouteRedirectProps = {
  href: string;
  message?: string;
};

export function toHref(pathname: string, params?: LegacyQueryParams): string {
  if (!params) {
    return pathname;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }
    searchParams.append(key, value);
  }

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function LegacyRouteRedirect({ href, message = 'Redirecting...' }: LegacyRouteRedirectProps) {
  React.useEffect(() => {
    router.replace(href as never);
  }, [href]);

  return <FullScreenLoader message={message} />;
}