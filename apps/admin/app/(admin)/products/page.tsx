'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import { LoadingSkeletonRows } from '@/src/components/ui/loading-skeleton';
import { deactivateLoanProduct, type LoanProduct, listLoanProducts, type ProductStatus } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { PageShell } from '@/src/ui/PageShell';
import { Select } from '@/src/ui/Select';

type ProductFilter = ProductStatus | 'ALL';

const FILTERS: ProductFilter[] = ['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'];

function productStatusBadge(status: ProductStatus) {
  if (status === 'ACTIVE') return { label: 'Active', variant: 'success' as const };
  if (status === 'ARCHIVED') return { label: 'Inactive', variant: 'warning' as const };
  return { label: 'Inactive', variant: 'neutral' as const };
}

function toTenure(minDays: number, maxDays: number): string {
  const unitFromDays = (days: number): { value: number; unit: 'day' | 'week' | 'month' } => {
    if (days % 30 === 0) return { value: Math.max(1, Math.round(days / 30)), unit: 'month' };
    if (days % 7 === 0) return { value: Math.max(1, Math.round(days / 7)), unit: 'week' };
    return { value: Math.max(1, days), unit: 'day' };
  };

  const min = unitFromDays(minDays);
  const max = unitFromDays(maxDays);
  if (min.unit === max.unit) {
    if (min.value === max.value) {
      return `${min.value} ${min.unit}${min.value > 1 ? 's' : ''}`;
    }
    return `${min.value} - ${max.value} ${max.unit}s`;
  }
  return `${minDays} - ${maxDays} days`;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [statusFilter, setStatusFilter] = useState<ProductFilter>('ALL');

  const productsQuery = useQuery({
    queryKey: ['admin', 'loan-products', tenantId, statusFilter],
    queryFn: () => listLoanProducts(statusFilter === 'ALL' ? undefined : statusFilter),
    enabled: Boolean(token && tenantId)
  });

  const disableMutation = useMutation({
    mutationFn: async (id: string) => deactivateLoanProduct(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'loan-products'] });
    }
  });

  const products = productsQuery.data ?? [];

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  return (
    <PageShell
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select
              aria-label="Filter product status"
              onChange={(event) => setStatusFilter(event.target.value as ProductFilter)}
              value={statusFilter}
            >
              {FILTERS.map((filter) => (
                <option key={filter} value={filter}>
                  {filter}
                </option>
              ))}
            </Select>
          </div>
          <Link href="/products/new">
            <Button className="focus:ring-2 focus:ring-slate-300">Create Product</Button>
          </Link>
        </div>
      }
      className="max-w-screen-2xl space-y-6 px-0 py-0"
      subtitle="Define and manage loan offerings across pricing and risk terms."
      title="Loan Products"
    >
      <DataTable
        columns={[
          { header: 'Name', className: 'w-[22%]' },
          { header: 'Interest Rate', className: 'w-[16%]' },
          { header: 'Tenure', className: 'w-[16%]' },
          { header: 'Risk Model', className: 'w-[18%]' },
          { header: 'Status', className: 'w-[14%]' },
          { header: 'Actions', className: 'w-[14%] text-right' }
        ]}
      >
        {productsQuery.isLoading ? <LoadingSkeletonRows rows={6} /> : null}

        {productsQuery.isError ? (
          <tr>
            <td className="px-4 py-6" colSpan={6}>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  {productsQuery.error instanceof Error ? productsQuery.error.message : 'Failed to load products.'}
                </p>
                <div className="mt-3">
                  <Button
                    className="focus:ring-2 focus:ring-slate-300"
                    onClick={() => productsQuery.refetch()}
                    size="sm"
                    variant="secondary"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </td>
          </tr>
        ) : null}

        {!productsQuery.isLoading && !productsQuery.isError && sortedProducts.length === 0 ? (
          <tr>
            <td className="px-4 py-6" colSpan={6}>
              <EmptyState
                description="Create your first product to begin underwriting against a standardized policy."
                title="No loan products"
                action={
                  <Link href="/products/new">
                    <Button className="focus:ring-2 focus:ring-slate-300" size="sm">
                      Create Product
                    </Button>
                  </Link>
                }
              />
            </td>
          </tr>
        ) : null}

        {!productsQuery.isLoading && !productsQuery.isError
          ? sortedProducts.map((product: LoanProduct) => {
              const badge = productStatusBadge(product.status);
              return (
                <tr className="transition-colors hover:bg-slate-50" key={product.id}>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <span className="font-medium text-slate-900">{product.name}</span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                    {(product.interestRateBps / 100).toFixed(2)}%
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                    {toTenure(product.minTenorDays, product.maxTenorDays)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">Standard Scorecard</td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/products/${product.id}`}>
                        <Button className="focus:ring-2 focus:ring-slate-300" size="sm" variant="secondary">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        className="focus:ring-2 focus:ring-slate-300"
                        disabled={product.status !== 'ACTIVE' || disableMutation.isPending}
                        onClick={() => disableMutation.mutate(product.id)}
                        size="sm"
                        variant="danger"
                      >
                        Deactivate
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          : null}
      </DataTable>
    </PageShell>
  );
}
