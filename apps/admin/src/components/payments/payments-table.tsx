import type { PaymentListItem, RepaymentListItem } from '@/src/features/payments/api';

export function PaymentsTable({
  tab,
  items
}: {
  tab: 'payments' | 'repayments';
  items: PaymentListItem[] | RepaymentListItem[];
}) {
  if (items.length === 0) {
    return <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">No records found.</div>;
  }

  if (tab === 'payments') {
    const paymentItems = items as PaymentListItem[];
    return (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Payment ID</th>
              <th className="px-3 py-2">Loan ID</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {paymentItems.map((item) => (
              <tr className="border-t border-border" key={item.id}>
                <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
                <td className="px-3 py-2 font-mono text-xs">{item.loanId ?? '-'}</td>
                <td className="px-3 py-2">{item.amountKobo.toLocaleString()} kobo</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{item.provider ?? '-'}</td>
                <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const repaymentItems = items as RepaymentListItem[];
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Repayment ID</th>
            <th className="px-3 py-2">Loan ID</th>
            <th className="px-3 py-2">Payment ID</th>
            <th className="px-3 py-2">Applied</th>
            <th className="px-3 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {repaymentItems.map((item) => (
            <tr className="border-t border-border" key={item.id}>
              <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
              <td className="px-3 py-2 font-mono text-xs">{item.loanId}</td>
              <td className="px-3 py-2 font-mono text-xs">{item.paymentId}</td>
              <td className="px-3 py-2">{item.totalAppliedKobo.toLocaleString()} kobo</td>
              <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
