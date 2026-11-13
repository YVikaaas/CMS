"use client";

import { useAuth } from "@/app/providers/AuthProvider";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";

export default function WaitingPage() {
  const { signOut } = useAuth();
  const { appUser } = useCurrentUser();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md rounded-2xl border border-[var(--cms-line)] bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Waiting for access</h1>
        <p className="mt-3 text-sm text-[var(--cms-muted)]">
          {appUser?.email
            ? `${appUser.email} is signed in, but an admin has not granted a role yet.`
            : "An admin has not granted a role yet."}
        </p>
        <button
          type="button"
          onClick={() => void signOut("/login")}
          className="mt-6 h-10 rounded-lg border border-[var(--cms-line)] px-4 text-sm font-medium hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
