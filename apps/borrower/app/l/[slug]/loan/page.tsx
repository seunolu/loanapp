'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TenantShell } from '@/src/components/tenant-shell';
import { getLoanSchedule } from '@/src/lib/api';

export default function LoanPage({ params }: { params: { slug: string } }) {
  const [loanId, setLoanId] = useState('');
  const [schedule, setSchedule] = useState<null | Awaited<ReturnType<typeof getLoanSchedule>>>(null);

  const loadSchedule = async () => {
    try {
      const data = await getLoanSchedule(loanId);
      setSchedule(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load schedule.');
    }
  };

  return (
    <TenantShell slug={params.slug} title="Loan">
      <Card>
        <CardHeader>
          <CardTitle>Active Loan Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input onChange={(event) => setLoanId(event.target.value)} placeholder="Loan ID" value={loanId} />
          <Button onClick={loadSchedule} type="button">
            Load Schedule
          </Button>
          {schedule && (
            <div className="rounded-md border border-border p-3 text-sm">
              {schedule.items.map((item) => (
                <div className="flex justify-between py-1" key={item.id}>
                  <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                  <span>
                    {item.amount.toLocaleString()} ({item.status})
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TenantShell>
  );
}
