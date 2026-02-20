export default function AdminRouteLoading(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-24 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
