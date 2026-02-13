import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function toCurrency(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export function DashboardKpiGrid({
  activeLoans,
  overdueLoans,
  totalOutstandingKobo,
  totalBorrowers
}: {
  activeLoans: number;
  overdueLoans: number;
  totalOutstandingKobo: number;
  totalBorrowers: number;
}) {
  const items = [
    { label: 'Active Loans', value: activeLoans.toLocaleString() },
    { label: 'Overdue Loans', value: overdueLoans.toLocaleString() },
    { label: 'Total Outstanding', value: toCurrency(totalOutstandingKobo) },
    { label: 'Total Borrowers', value: totalBorrowers.toLocaleString() }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
