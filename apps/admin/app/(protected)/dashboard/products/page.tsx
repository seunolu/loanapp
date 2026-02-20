'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { type ProductStatus, listLoanProducts } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Button } from '@/components/ui/button';

const FILTERS: Array<ProductStatus | 'ALL'> = ['ALL', 'DRAFT', 'ACTIVE', 'ARCHIVED'];

export default function ProductsPage() {
  const [status, setStatus] = useState<ProductStatus | 'ALL'>('ALL');
  const { token } = useAuth();
  const { tenantId } = useTenant();

  const productsQuery = useQuery({
    queryKey: ['admin', 'products', tenantId, status],
    queryFn: () => listLoanProducts(status === 'ALL' ? undefined : status),
    enabled: Boolean(token && tenantId)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Loan Products</h1>
        <Link href="/dashboard/products/new">
          <Button>New Product</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item}
            onClick={() => setStatus(item)}
            variant={status === item ? 'default' : 'outline'}
          >
            {item}
          </Button>
        ))}
      </div>

      {productsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading products...</p>}
      {productsQuery.isError && (
        <p className="text-sm text-destructive">
          {productsQuery.error instanceof Error ? productsQuery.error.message : 'Failed to load products.'}
        </p>
      )}

      {productsQuery.data ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Principal Range</th>
                <th className="px-3 py-2">Tenor Days</th>
                <th className="px-3 py-2">Rate</th>
              </tr>
            </thead>
            <tbody>
              {productsQuery.data.map((item) => (
                <tr className="border-t border-border hover:bg-muted/40" key={item.id}>
                  <td className="px-3 py-2">
                    <Link className="underline" href={`/dashboard/products/${item.id}`}>
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">
                    {item.minPrincipal} - {item.maxPrincipal}
                  </td>
                  <td className="px-3 py-2">
                    {item.minTenorDays} - {item.maxTenorDays}
                  </td>
                  <td className="px-3 py-2">
                    {item.interestType} {item.interestRateBps} bps
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
