'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TenantShell } from '@/src/components/tenant-shell';
import { createLoanApplication } from '@/src/lib/api';

const schema = z.object({
  amountRequested: z.coerce.number().int().min(500000).max(10000000),
  tenorDays: z.coerce.number().int().min(7).max(60)
});
type FormValues = z.infer<typeof schema>;

export default function ApplyPage({ params }: { params: { slug: string } }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amountRequested: 500000,
      tenorDays: 30
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await createLoanApplication(values);
      toast.success(`Application submitted: ${response.applicationId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit application.');
    }
  });

  return (
    <TenantShell slug={params.slug} title="Apply for Loan">
      <Card>
        <CardHeader>
          <CardTitle>Loan Application</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input placeholder="Amount in kobo" type="number" {...form.register('amountRequested')} />
            <Input placeholder="Tenor in days" type="number" {...form.register('tenorDays')} />
            <Button type="submit">Submit Application</Button>
          </form>
        </CardContent>
      </Card>
    </TenantShell>
  );
}
