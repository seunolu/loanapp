import type { BorrowerRisk } from '@/src/features/borrowers/api';

export function BorrowerRiskTab({ risk }: { risk: BorrowerRisk | undefined }) {
  if (!risk) {
    return <p className="text-sm text-muted-foreground">No risk data.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Risk Score" value={String(risk.profile?.score ?? 0)} />
        <Metric label="Risk Level" value={risk.profile?.level ?? 'N/A'} />
        <Metric
          label="Last Evaluated"
          value={risk.profile?.lastEvaluatedAt ? new Date(risk.profile.lastEvaluatedAt).toLocaleString() : 'N/A'}
        />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Recent Risk Events</h3>
        <div className="space-y-2">
          {risk.events.map((event) => (
            <div className="rounded-md border border-border p-3" key={event.id}>
              <div className="text-sm font-medium">{event.eventType}</div>
              <div className="text-xs text-muted-foreground">
                Score {event.totalScore} ({event.scoreDelta >= 0 ? '+' : ''}
                {event.scoreDelta}) • {event.level} • {new Date(event.createdAt).toLocaleString()}
              </div>
              {event.reason && <p className="mt-1 text-xs">{event.reason}</p>}
            </div>
          ))}
          {risk.events.length === 0 && <p className="text-sm text-muted-foreground">No events.</p>}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
