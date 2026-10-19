import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <section className="w-full max-w-lg rounded-xl border border-border bg-card p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Error 403</p>
        <h1 className="mt-2 text-3xl font-bold text-card-foreground">Forbidden</h1>
        <p className="mt-3 text-sm text-muted-foreground">You do not have permission to access this page.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Go Home
          </Link>
        </div>
      </section>
    </main>
  )
}
