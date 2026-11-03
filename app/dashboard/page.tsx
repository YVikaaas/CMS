"use client";

import { useAuth } from "@/app/providers/AuthProvider";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-sm text-[var(--cms-muted)]">
        Loading…
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--cms-action)] text-sm font-semibold text-white"
            aria-hidden
          >
            C
          </span>
          <div>
            <h1 className="text-lg font-semibold">CMS</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut("/login")}
          className="h-9 rounded-lg border border-[var(--cms-line)] bg-white px-3 text-sm font-medium hover:bg-slate-50"
        >
          Sign out
        </button>
      </header>

      <section className="rounded-2xl border border-[var(--cms-line)] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold">You are signed in</h2>
        <p className="mt-2 text-sm text-[var(--cms-muted)]">
          {user?.email ?? "No email on this session."}
        </p>
        <p className="mt-4 text-sm text-slate-600">
          This is the CMS shell. Features and tables come next.
        </p>
      </section>
    </main>
  );
}
