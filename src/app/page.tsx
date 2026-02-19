import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="mb-3 inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-900">
          Paperwork OS
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Vault + Packs</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Collect documents in one secure vault, extract structured profile fields, and generate reusable
          application packs in minutes.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
