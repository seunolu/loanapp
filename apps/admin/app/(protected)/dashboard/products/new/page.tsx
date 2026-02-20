'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { createLoanProduct, type CreateLoanProductInput } from '@/src/lib/api';
import { useTenant } from '@/src/providers/tenant-provider';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { PageShell } from '@/src/ui/PageShell';
import { Select } from '@/src/ui/Select';

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const [form, setForm] = useState<CreateLoanProductInput>({
    name: '',
    currency: 'NGN',
    minPrincipal: 10000,
    maxPrincipal: 1000000,
    minTenorDays: 7,
    maxTenorDays: 180,
    interestType: 'FLAT',
    interestRateBps: 2400,
    repaymentFrequency: 'WEEKLY',
    graceDays: 0,
    allowEarlyRepayment: true
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => createLoanProduct(form),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products', tenantId] });
      router.push(`/dashboard/products/${created.id}`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create product.');
    }
  });

  const aprPercent = useMemo(() => (form.interestRateBps / 100).toFixed(2), [form.interestRateBps]);
  const tenorMonths = useMemo(
    () => `${(form.minTenorDays / 30).toFixed(1)} - ${(form.maxTenorDays / 30).toFixed(1)} months`,
    [form.minTenorDays, form.maxTenorDays]
  );
  const validationError = useMemo(() => {
    if (!form.name.trim()) return 'Product name is required.';
    if (form.minPrincipal <= 0 || form.maxPrincipal <= 0) return 'Principal range must be greater than 0.';
    if (form.minPrincipal > form.maxPrincipal) return 'Minimum principal cannot be greater than maximum principal.';
    if (form.minTenorDays <= 0 || form.maxTenorDays <= 0) return 'Tenor range must be greater than 0 days.';
    if (form.minTenorDays > form.maxTenorDays) return 'Minimum tenor cannot be greater than maximum tenor.';
    if (form.interestRateBps < 0) return 'Interest rate cannot be negative.';
    return null;
  }, [form]);

  const onSubmit = () => {
    setError(null);
    if (validationError) {
      setError(validationError);
      return;
    }
    createMutation.mutate();
  };

  return (
    <PageShell
      className="max-w-screen-2xl space-y-6 px-0 py-0"
      subtitle="Define product pricing and repayment rules. All values below are in NGN and days."
      title="Create Product"
    >
      <div className="mx-auto w-full max-w-3xl">
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <h2 className="text-lg font-medium text-slate-900">Product Configuration</h2>
          </CardHeader>
          <CardContent className="space-y-5">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                hint="Internal and customer-facing product name."
                label="Product Name"
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Fast Loan"
                value={form.name}
              />
              <Input
                hint="3-letter ISO currency code."
                label="Currency"
                maxLength={3}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                placeholder="NGN"
                value={form.currency}
              />

              <Input
                hint="Smallest loan amount a borrower can request."
                label="Minimum Principal (NGN)"
                onChange={(event) => setForm((prev) => ({ ...prev, minPrincipal: Number(event.target.value || 0) }))}
                type="number"
                value={form.minPrincipal}
              />
              <Input
                hint="Largest loan amount a borrower can request."
                label="Maximum Principal (NGN)"
                onChange={(event) => setForm((prev) => ({ ...prev, maxPrincipal: Number(event.target.value || 0) }))}
                type="number"
                value={form.maxPrincipal}
              />

              <Input
                hint="Shortest allowed loan term."
                label="Minimum Tenor (days)"
                onChange={(event) => setForm((prev) => ({ ...prev, minTenorDays: Number(event.target.value || 0) }))}
                type="number"
                value={form.minTenorDays}
              />
              <Input
                hint="Longest allowed loan term."
                label="Maximum Tenor (days)"
                onChange={(event) => setForm((prev) => ({ ...prev, maxTenorDays: Number(event.target.value || 0) }))}
                type="number"
                value={form.maxTenorDays}
              />

              <Select
                hint="Flat: interest on original principal. Reducing: interest on outstanding balance."
                label="Interest Type"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, interestType: event.target.value as CreateLoanProductInput['interestType'] }))
                }
                value={form.interestType}
              >
                <option value="FLAT">FLAT</option>
                <option value="REDUCING">REDUCING</option>
              </Select>
              <Input
                hint="Stored in basis points. 2400 bps = 24.00%."
                label="Interest Rate (bps)"
                onChange={(event) => setForm((prev) => ({ ...prev, interestRateBps: Number(event.target.value || 0) }))}
                type="number"
                value={form.interestRateBps}
              />

              <Select
                hint="How often borrower is expected to repay."
                label="Repayment Frequency"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    repaymentFrequency: event.target.value as CreateLoanProductInput['repaymentFrequency']
                  }))
                }
                value={form.repaymentFrequency}
              >
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="BIWEEKLY">BIWEEKLY</option>
                <option value="MONTHLY">MONTHLY</option>
              </Select>
              <Input
                hint="Days after due date before collections/penalties begin."
                label="Grace Period (days)"
                onChange={(event) => setForm((prev) => ({ ...prev, graceDays: Number(event.target.value || 0) }))}
                type="number"
                value={form.graceDays}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                <span className="font-medium">Rate preview:</span> {aprPercent}% annual
              </p>
              <p>
                <span className="font-medium">Tenor preview:</span> {tenorMonths}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                checked={form.allowEarlyRepayment}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-300"
                onChange={(event) => setForm((prev) => ({ ...prev, allowEarlyRepayment: event.target.checked }))}
                type="checkbox"
              />
              Allow Early Repayment
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button onClick={() => router.push('/dashboard/products')} variant="secondary">
                Cancel
              </Button>
              <Button disabled={createMutation.isPending || Boolean(validationError)} onClick={onSubmit}>
                {createMutation.isPending ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
