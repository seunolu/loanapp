'use client';

import { useQuery } from '@tanstack/react-query';
import { getTenantConfigBySlug } from '@/src/lib/api';

export function useTenantConfig(slug: string) {
  return useQuery({
    queryKey: ['tenant-config', slug],
    queryFn: () => getTenantConfigBySlug(slug),
    enabled: Boolean(slug)
  });
}
