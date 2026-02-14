'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TenantShell } from '@/src/components/tenant-shell';
import { initializeRepayment } from '@/src/lib/api';

const schema = z.object({
  loanId: z.string().min(1),
  amountKobo: z.coerce.number().int().positive()
});
type FormValues = z.infer<typeof schema>;

export default function RepayPage({ params }: { params: { slug: string } }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      loanId: '',
      amountKobo: 50000
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payment = await initializeRepayment(values.loanId, values.amountKobo);
      window.location.href = payment.authorizationUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment initialization failed.');
    }
  });

  return (
    <TenantShell slug={params.slug} title="Repay Loan">
      <Card>
        <CardHeader>
          <CardTitle>Initialize Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input placeholder="Loan ID" {...form.register('loanId')} />
            <Input placeholder="Amount in kobo" type="number" {...form.register('amountKobo')} />
            <Button type="submit">Proceed to Paystack</Button>
          </form>
        </CardContent>
      </Card>
    </TenantShell>
  );
}
