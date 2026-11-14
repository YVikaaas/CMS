"use client";

import { useAuth } from "@/app/providers/AuthProvider";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import { SoftButton } from "@/components/ops";

export default function WaitingPage() {
  const { signOut } = useAuth();
  const { appUser } = useCurrentUser();

  return (
    <main className="ops-page-enter flex min-h-dvh flex-col items-center justify-center bg-[var(--ops-bg)] px-6 py-12">
      <div className="max-w-md rounded-2xl border border-[var(--ops-line)] bg-[var(--ops-surface)] p-8 text-center shadow-[var(--ops-shadow-card)]">
        <h1 className="text-lg font-semibold">Waiting for access</h1>
        <p className="mt-3 text-sm text-[var(--ops-text-muted)]">
          {appUser?.email
            ? `${appUser.email} is signed in, but an admin has not granted a role yet.`
            : "An admin has not granted a role yet."}
        </p>
        <SoftButton className="mt-6" onClick={() => void signOut("/login")}>
          Sign out
        </SoftButton>
      </div>
    </main>
  );
}
