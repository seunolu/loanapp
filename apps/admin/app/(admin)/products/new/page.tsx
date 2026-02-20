'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { activateLoanProduct, createLoanProduct } from '@/src/lib/api';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { PageShell } from '@/src/ui/PageShell';
import { Select } from '@/src/ui/Select';

type TenureUnit = 'DAYS' | 'WEEKS' | 'MONTHS';

type ProductFormState = {
  name: string;
  interestRatePercent: string;
  tenureValue: string;
  tenureUnit: TenureUnit;
  maxAmount: string;
  riskModel: string;
  active: boolean;
};

function validateForm(form: ProductFormState): string | null {
  if (!form.name.trim()) return 'Product name is required.';
  if (!form.interestRatePercent.trim() || Number(form.interestRatePercent) <= 0) return 'Interest rate must be greater than 0.';
  if (!form.tenureValue.trim() || Number(form.tenureValue) <= 0) return 'Tenure must be greater than 0.';
  if (!form.maxAmount.trim() || Number(form.maxAmount) <= 0) return 'Max amount must be greater than 0.';
  return null;
}

function tenureToDays(value: number, unit: TenureUnit): number {
  if (unit === 'DAYS') return value;
  if (unit === 'WEEKS') return value * 7;
  return value * 30;
}

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>({
    name: '',
    interestRatePercent: '24',
    tenureValue: '6',
    tenureUnit: 'MONTHS',
    maxAmount: '1000000',
    riskModel: 'STANDARD',
    active: true
  });

  const validationError = useMemo(() => validateForm(form), [form]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const interestRateBps = Math.round(Number(form.interestRatePercent) * 100);
      const tenorDays = Math.max(1, Math.round(tenureToDays(Number(form.tenureValue), form.tenureUnit)));
      const maxPrincipal = Math.round(Number(form.maxAmount));

      const created = await createLoanProduct({
        name: form.name.trim(),
        currency: 'NGN',
        minPrincipal: 1,
        maxPrincipal,
        minTenorDays: tenorDays,
        maxTenorDays: tenorDays,
        interestType: 'FLAT',
        interestRateBps,
        repaymentFrequency: 'MONTHLY',
        graceDays: 0,
        allowEarlyRepayment: true
      });

      if (form.active && created.status !== 'ACTIVE') {
        await activateLoanProduct(created.id);
      }

      return created;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'loan-products'] });
      router.push('/products');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create product.');
    }
  });

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
      subtitle="Configure pricing, tenure, and risk settings for a new lending product."
      title="Create Loan Product"
    >
      <div className="mx-auto w-full max-w-2xl">
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <h2 className="text-lg font-medium text-slate-900">Create Loan Product</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            ) : null}

            <Input
              label="Product Name"
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Payroll Advance"
              value={form.name}
            />
            <Input
              label="Interest Rate (%)"
              onChange={(event) => setForm((prev) => ({ ...prev, interestRatePercent: event.target.value }))}
              placeholder="24"
              type="number"
              value={form.interestRatePercent}
            />
            <Input
              label="Tenure"
              onChange={(event) => setForm((prev) => ({ ...prev, tenureValue: event.target.value }))}
              placeholder="6"
              type="number"
              value={form.tenureValue}
              hint="Pick unit beside this field (days, weeks, or months)."
            />
            <Select
              label="Tenure Unit"
              onChange={(event) => setForm((prev) => ({ ...prev, tenureUnit: event.target.value as TenureUnit }))}
              value={form.tenureUnit}
            >
              <option value="DAYS">Days</option>
              <option value="WEEKS">Weeks</option>
              <option value="MONTHS">Months</option>
            </Select>
            <Input
              label="Max Amount"
              onChange={(event) => setForm((prev) => ({ ...prev, maxAmount: event.target.value }))}
              placeholder="1000000"
              type="number"
              value={form.maxAmount}
            />
            <Select
              label="Risk Model"
              onChange={(event) => setForm((prev) => ({ ...prev, riskModel: event.target.value }))}
              value={form.riskModel}
              hint="Current release supports one underwriting model: Standard Scorecard."
              disabled
            >
              <option value="STANDARD">Standard Scorecard</option>
            </Select>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                checked={form.active}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-300"
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                type="checkbox"
              />
              Make Live After Save
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button className="focus:ring-2 focus:ring-slate-300" onClick={() => router.push('/products')} variant="secondary">
                Cancel
              </Button>
              <Button
                className="focus:ring-2 focus:ring-slate-300"
                disabled={createMutation.isPending || Boolean(validationError)}
                onClick={onSubmit}
              >
                {createMutation.isPending ? 'Saving...' : 'Save Product'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
