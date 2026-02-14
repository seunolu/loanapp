import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Borrower Web App</h1>
        <p className="text-sm text-muted-foreground">Open a tenant route to continue.</p>
        <Link className="text-primary underline" href="/l/default">
          Go to /l/default
        </Link>
      </div>
    </main>
  );
}
