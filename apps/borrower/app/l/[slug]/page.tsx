'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantShell } from '@/src/components/tenant-shell';
import { useTenantConfig } from '@/src/features/tenant/hooks/use-tenant-config';

export default function LandingPage({ params }: { params: { slug: string } }) {
  const configQuery = useTenantConfig(params.slug);
  const config = configQuery.data;

  return (
    <TenantShell slug={params.slug} title="Welcome">
      {configQuery.isLoading && <p className="text-sm text-muted-foreground">Loading tenant config...</p>}
      {configQuery.isError && (
        <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          Could not load tenant configuration.
        </p>
      )}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>{config.branding.displayName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Loan range: {config.policy.minLoanAmountKobo.toLocaleString()} -{' '}
              {config.policy.maxLoanAmountKobo.toLocaleString()} kobo
            </p>
            <p>
              Tenor: {config.policy.minTenorDays} - {config.policy.maxTenorDays} days
            </p>
            <div className="flex gap-2">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                href={`/l/${params.slug}/login`}
              >
                Login
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium"
                href={`/l/${params.slug}/apply`}
              >
                Apply
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </TenantShell>
  );
}
