import Link from "next/link"

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-sky-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 p-6">
      <section className="w-full max-w-xl rounded-2xl border border-blue-200/70 dark:border-blue-900 bg-white/90 dark:bg-slate-900/90 p-8 shadow-xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-blue-600 dark:text-blue-300">ERROR 403</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Forbidden</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          You do not have permission to access this page.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/50"
          >
            Go Home
          </Link>
        </div>
      </section>
    </main>
  )
}
