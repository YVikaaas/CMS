import { Suspense } from "react";
import { PageLoader } from "@/components/ops";
import EmailMagicLinkForm from "./EmailMagicLinkForm";

function CmsMark() {
  return (
    <span
      className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ops-primary)] font-display text-xl font-bold text-[var(--ops-on-primary)]"
      aria-hidden
    >
      C
    </span>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--ops-bg)] px-6 py-12">
      <div className="soft-card w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <CmsMark />
          <h1 className="text-xl font-semibold tracking-tight">CMS</h1>
          <p className="text-center text-sm text-[var(--ops-text-muted)]">
            Sign in with email and password. Magic link is optional.
          </p>
        </div>
        <Suspense fallback={<PageLoader compact label="Loading sign in" />}>
          <EmailMagicLinkForm />
        </Suspense>
      </div>
    </main>
  );
}
