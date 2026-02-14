'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantShell } from '@/src/components/tenant-shell';

export default function SuccessPage({ params }: { params: { slug: string } }) {
  return (
    <TenantShell slug={params.slug} title="Payment Success">
      <Card>
        <CardHeader>
          <CardTitle>Payment Submitted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Your payment has been submitted. We will update your loan balance shortly.</p>
          <Link className="text-primary underline" href={`/l/${params.slug}/loan`}>
            View Loan Schedule
          </Link>
        </CardContent>
      </Card>
    </TenantShell>
  );
}
