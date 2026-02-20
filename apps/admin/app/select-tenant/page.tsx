'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { resolveTenant } from '@/src/lib/api';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { PageShell } from '@/src/ui/PageShell';

export default function SelectTenantPage() {
  const router = useRouter();
  const { setTenant, tenantId, hydrated } = useTenant();
  const [tenantSlug, setTenantSlug] = useState('demo');
  const [lenderTitle, setLenderTitle] = useState('Demo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hydrated && tenantId) {
      router.replace('/dashboard');
    }
  }, [hydrated, router, tenantId]);

  if (hydrated && tenantId) {
    return null;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = await resolveTenant({ slug: tenantSlug.trim(), lenderTitle: lenderTitle.trim() });
      if (!payload.tenantId) {
        throw new Error('Tenant resolve failed');
      }
      setTenant({
        tenantSlug: tenantSlug.trim(),
        lenderTitle: lenderTitle.trim(),
        tenantId: payload.tenantId
      });
      router.replace('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Tenant resolve failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-6 md:px-6">
        <PageShell
          className="w-full max-w-xl px-0 py-0"
          subtitle="Choose which lender environment you're managing."
          title="Select Tenant"
        >
          <Card className="w-full">
            <CardHeader className="space-y-1 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Tenant Access</h2>
              <p className="text-sm text-muted-foreground">Provide tenant slug and lender title.</p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                {error ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <Badge variant="danger">{error}</Badge>
                  </div>
                ) : null}
                <Input
                  id="tenantSlug"
                  label="Slug"
                  onChange={(event) => setTenantSlug(event.target.value)}
                  placeholder="demo"
                  value={tenantSlug}
                />
                <Input
                  id="lenderTitle"
                  label="Lender title"
                  onChange={(event) => setLenderTitle(event.target.value)}
                  placeholder="Demo"
                  value={lenderTitle}
                />
                <Button fullWidth loading={submitting} type="submit">
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        </PageShell>
      </div>
    </main>
  );
}
