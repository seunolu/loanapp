export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">This screen is scaffolded and ready for implementation.</p>
    </div>
  );
}
