'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TenantShell } from '@/src/components/tenant-shell';
import { acceptOffer, getOfferByApplication } from '@/src/lib/api';

export default function OfferPage({ params }: { params: { slug: string } }) {
  const [applicationId, setApplicationId] = useState('');
  const [offer, setOffer] = useState<null | Awaited<ReturnType<typeof getOfferByApplication>>>(null);

  const loadOffer = async () => {
    try {
      const data = await getOfferByApplication(applicationId);
      setOffer(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load offer.');
    }
  };

  const accept = async () => {
    if (!offer) {
      return;
    }
    try {
      const result = await acceptOffer(offer.offerId);
      toast.success(`Offer accepted. Loan ID: ${result.loanId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept offer.');
    }
  };

  return (
    <TenantShell slug={params.slug} title="Offer">
      <Card>
        <CardHeader>
          <CardTitle>View Offer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input onChange={(event) => setApplicationId(event.target.value)} placeholder="Application ID" value={applicationId} />
          <Button onClick={loadOffer} type="button">
            Load Offer
          </Button>
          {offer && (
            <div className="space-y-2 text-sm">
              <p>Status: {offer.status}</p>
              <p>Total Repayable: {offer.totalRepayable.toLocaleString()} kobo</p>
              <div className="rounded-md border border-border p-3">
                {offer.schedule.map((item) => (
                  <div className="flex justify-between" key={item.id}>
                    <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                    <span>{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Button onClick={accept} type="button">
                Accept Offer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TenantShell>
  );
}
