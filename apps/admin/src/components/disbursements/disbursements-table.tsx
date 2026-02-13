import { Button } from '@/components/ui/button';
import type { DisbursementListItem } from '@/src/features/disbursements/api';

export function DisbursementsTable({
  items,
  canInitiate,
  onInitiate
}: {
  items: DisbursementListItem[];
  canInitiate: boolean;
  onInitiate: (item: DisbursementListItem) => void;
}) {
  if (items.length === 0) {
    return <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">No disbursements found.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Loan</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="border-t border-border" key={item.id}>
              <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
              <td className="px-3 py-2 font-mono text-xs">{item.loanId}</td>
              <td className="px-3 py-2">{item.amountKobo.toLocaleString()} kobo</td>
              <td className="px-3 py-2">{item.status}</td>
              <td className="px-3 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
              <td className="px-3 py-2 text-right">
                {canInitiate && item.status === 'PENDING' ? (
                  <Button onClick={() => onInitiate(item)} size="sm" variant="outline">
                    Initiate
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
