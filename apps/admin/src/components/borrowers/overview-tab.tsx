import type { BorrowerDetail } from '@/src/features/borrowers/api';

export function BorrowerOverviewTab({ borrower }: { borrower: BorrowerDetail }) {
  const profile = borrower.profile;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Borrower ID" value={borrower.id} />
      <Field label="Phone" value={borrower.phone} />
      <Field label="Created At" value={new Date(borrower.createdAt).toLocaleString()} />
      <Field label="Lender ID" value={borrower.lenderId} />
      <Field label="First Name" value={profile?.firstName ?? '-'} />
      <Field label="Last Name" value={profile?.lastName ?? '-'} />
      <Field label="Date of Birth" value={profile?.dateOfBirth ?? '-'} />
      <Field label="Gender" value={profile?.gender ?? '-'} />
      <Field label="Address" value={profile?.addressLine1 ?? '-'} />
      <Field label="City" value={profile?.city ?? '-'} />
      <Field label="State" value={profile?.state ?? '-'} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
