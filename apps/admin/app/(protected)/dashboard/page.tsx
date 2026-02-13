'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { CollectionsTable } from '@/src/components/dashboard/collections-table';
import { DashboardKpiGrid } from '@/src/components/dashboard/kpi-grid';
import { ParCards } from '@/src/components/dashboard/par-cards';
import { useDashboardData } from '@/src/features/dashboard/hooks/use-dashboard-data';

export default function DashboardPage() {
  const { summaryQuery, collectionsQuery, parQuery, isLoading, isError } = useDashboardData();

  return (
    <RequirePermission permission="REPORTS_VIEW">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Portfolio and collections overview.</p>
        </div>

        {isLoading && <div className="text-sm text-muted-foreground">Loading dashboard...</div>}
        {isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load dashboard data.
          </div>
        )}

        {!isLoading && !isError && summaryQuery.data && collectionsQuery.data && parQuery.data && (
          <>
            <DashboardKpiGrid
              activeLoans={summaryQuery.data.activeLoans}
              overdueLoans={summaryQuery.data.overdueLoans}
              totalBorrowers={summaryQuery.data.totalBorrowers}
              totalOutstandingKobo={summaryQuery.data.outstandingTotalKobo}
            />
            <ParCards par={parQuery.data} />
            <CollectionsTable report={collectionsQuery.data} />
          </>
        )}
      </div>
    </RequirePermission>
  );
}
