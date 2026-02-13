import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CollectionsReport } from '@/src/features/dashboard/api';

function toCurrency(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export function CollectionsTable({ report }: { report: CollectionsReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-sm text-muted-foreground">
          Total: {toCurrency(report.totalCollectedKobo)} ({report.paymentsCount.toLocaleString()} payments)
        </div>
        <div className="max-h-72 overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {report.dailyBuckets.map((bucket) => (
                <tr className="border-t border-border" key={bucket.date}>
                  <td className="px-3 py-2">{bucket.date}</td>
                  <td className="px-3 py-2">{toCurrency(bucket.amountKobo)}</td>
                  <td className="px-3 py-2">{bucket.count.toLocaleString()}</td>
                </tr>
              ))}
              {report.dailyBuckets.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={3}>
                    No collections in range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
