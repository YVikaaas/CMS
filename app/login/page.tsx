import { Suspense } from "react";
import EmailMagicLinkForm from "./EmailMagicLinkForm";

function CmsMark() {
  return (
    <span
      className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--cms-action)] text-xl font-semibold text-white"
      aria-hidden
    >
      C
    </span>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <CmsMark />
        <h1 className="text-xl font-semibold tracking-tight">CMS</h1>
        <p className="text-sm text-[var(--cms-muted)]">
          Sign in with email and password. Magic link is optional.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-[var(--cms-muted)]">Loading…</p>}>
        <EmailMagicLinkForm />
      </Suspense>
    </main>
  );
}
