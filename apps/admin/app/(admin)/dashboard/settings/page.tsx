'use client';

import Link from 'next/link';

import { PageHeader } from '@/src/components/layout/page-header';
import { Button } from '@/src/ui/Button';
import { Card, CardContent } from '@/src/ui/Card';

export default function DashboardSettingsPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage workspace-level preferences and operational defaults for this tenant."
      />

      <Card>
        <CardContent className="space-y-4 py-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Workspace Configuration</h2>
            <p className="mt-1 text-sm text-slate-600">
              Core settings modules are available from the dashboard navigation sections (Risk, Treasury, Operations,
              and Compliance).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/admin-users">
              <Button size="sm">Open Admin Users</Button>
            </Link>
            <Link href="/dashboard/risk/policies">
              <Button size="sm" variant="secondary">
                Open Risk Policies
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
