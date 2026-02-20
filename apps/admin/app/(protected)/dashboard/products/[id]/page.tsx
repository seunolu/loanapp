'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  addLoanProductFee,
  archiveLoanProduct,
  computeOffer,
  getLoanProduct,
  type LoanProduct,
  type ProductStatus,
  removeLoanProductFee,
  updateLoanProduct
} from '@/src/lib/api';
import { useTenant } from '@/src/providers/tenant-provider';

type Props = { params: { id: string } };

export default function ProductDetailPage({ params }: Props) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [computeInputs, setComputeInputs] = useState({ principalMinor: 100000, tenorDays: 30 });
  const [feeForm, setFeeForm] = useState({
    name: '',
    type: 'FIXED' as const,
    amount: 0,
    applyAt: 'UPFRONT' as const
  });
  const [offerState, setOfferState] = useState<any>(null);

  const productQuery = useQuery({
    queryKey: ['admin', 'product', tenantId, params.id],
    queryFn: () => getLoanProduct(params.id)
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'product', tenantId, params.id] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'products', tenantId] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'product-fees', tenantId, params.id] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<LoanProduct>) => updateLoanProduct(params.id, payload),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : 'Update failed.')
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const product = await getLoanProduct(params.id);
      if (product.status === 'ACTIVE') {
        return product;
      }
      return (await import('@/src/lib/api')).activateLoanProduct(params.id);
    },
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : 'Activate failed.')
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveLoanProduct(params.id),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : 'Archive failed.')
  });

  const addFeeMutation = useMutation({
    mutationFn: () => addLoanProductFee(params.id, feeForm),
    onSuccess: async () => {
      setFeeForm({ name: '', type: 'FIXED', amount: 0, applyAt: 'UPFRONT' });
      await refresh();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Add fee failed.')
  });

  const removeFeeMutation = useMutation({
    mutationFn: (feeId: string) => removeLoanProductFee(params.id, feeId),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : 'Remove fee failed.')
  });

  const computeMutation = useMutation({
    mutationFn: () => computeOffer(params.id, computeInputs),
    onSuccess: (data) => {
      setOfferState(data);
      queryClient.setQueryData(
        ['admin', 'offer', tenantId, params.id, computeInputs.principalMinor, computeInputs.tenorDays],
        data
      );
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Compute failed.')
  });

  const product = productQuery.data;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Product Details</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {productQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
      {product ? (
        <>
          <div className="grid gap-2 rounded-md border border-border p-4 text-sm md:grid-cols-2">
            <div>ID: {product.id}</div>
            <div>Status: {product.status}</div>
            <div>Name: {product.name}</div>
            <div>Currency: {product.currency}</div>
            <div>Principal: {product.minPrincipal} - {product.maxPrincipal}</div>
            <div>Tenor: {product.minTenorDays} - {product.maxTenorDays} days</div>
            <div>Interest: {product.interestType} {product.interestRateBps} bps</div>
            <div>Frequency: {product.repaymentFrequency}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => updateMutation.mutate({ name: `${product.name}` })} variant="outline">
              Save Name
            </Button>
            {product.status !== 'ACTIVE' ? (
              <Button disabled={activateMutation.isPending} onClick={() => activateMutation.mutate()}>
                {activateMutation.isPending ? 'Activating...' : 'Activate'}
              </Button>
            ) : null}
            {product.status !== 'ARCHIVED' ? (
              <Button disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate()} variant="destructive">
                {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
              </Button>
            ) : null}
          </div>

          <div className="rounded-md border border-border p-4">
            <p className="mb-2 text-sm font-medium">Fees</p>
            <div className="space-y-1 text-sm">
              {product.fees.map((fee) => (
                <div className="flex items-center justify-between rounded border p-2" key={fee.id}>
                  <span>
                    {fee.name} - {fee.type} {fee.amount} ({fee.applyAt})
                  </span>
                  <Button onClick={() => removeFeeMutation.mutate(fee.id)} size="sm" variant="outline">
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
              <input className="rounded border px-2 py-1 text-sm" placeholder="Fee Name" value={feeForm.name} onChange={(e) => setFeeForm((f) => ({ ...f, name: e.target.value }))} />
              <select className="rounded border px-2 py-1 text-sm" value={feeForm.type} onChange={(e) => setFeeForm((f) => ({ ...f, type: e.target.value as any }))}>
                <option value="FIXED">FIXED</option>
                <option value="PERCENT_OF_PRINCIPAL">PERCENT_OF_PRINCIPAL</option>
              </select>
              <input className="rounded border px-2 py-1 text-sm" type="number" placeholder="Amount (minor/bps)" value={feeForm.amount} onChange={(e) => setFeeForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
              <select className="rounded border px-2 py-1 text-sm" value={feeForm.applyAt} onChange={(e) => setFeeForm((f) => ({ ...f, applyAt: e.target.value as any }))}>
                <option value="UPFRONT">UPFRONT</option>
                <option value="PER_INSTALLMENT">PER_INSTALLMENT</option>
                <option value="END">END</option>
              </select>
            </div>
            <Button className="mt-2" disabled={addFeeMutation.isPending || !feeForm.name.trim()} onClick={() => addFeeMutation.mutate()}>
              {addFeeMutation.isPending ? 'Adding...' : 'Add Fee'}
            </Button>
          </div>

          <div className="rounded-md border border-border p-4">
            <p className="mb-2 text-sm font-medium">Compute Offer</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input className="rounded border px-2 py-1 text-sm" type="number" placeholder="Principal (minor)" value={computeInputs.principalMinor} onChange={(e) => setComputeInputs((prev) => ({ ...prev, principalMinor: Number(e.target.value) }))} />
              <input className="rounded border px-2 py-1 text-sm" type="number" placeholder="Tenor Days" value={computeInputs.tenorDays} onChange={(e) => setComputeInputs((prev) => ({ ...prev, tenorDays: Number(e.target.value) }))} />
              <Button disabled={computeMutation.isPending} onClick={() => computeMutation.mutate()}>
                {computeMutation.isPending ? 'Computing...' : 'Compute'}
              </Button>
            </div>
            {offerState ? (
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  Totals: Principal {offerState.totals.principal}, Interest {offerState.totals.interest}, Fees {offerState.totals.fees}, Total {offerState.totals.total}
                </p>
                <div className="max-h-72 overflow-auto rounded border p-2">
                  <pre className="text-xs">{JSON.stringify(offerState.schedule, null, 2)}</pre>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
