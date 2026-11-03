"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authSendMagicLink } from "@/lib/services";
import { safeNextPathAfterLogin } from "@/lib/utils/routes";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function EmailMagicLinkForm() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeNextPathAfterLogin(searchParams.get("next")),
    [searchParams],
  );
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setFieldError("Enter a valid email.");
      toast.error("Fill the highlighted fields.");
      return;
    }

    setSending(true);
    const redirect = new URL("/auth/callback", window.location.origin);
    redirect.searchParams.set("next", nextPath);
    const { error } = await authSendMagicLink({
      email: trimmed,
      emailRedirectTo: redirect.toString(),
    });
    setSending(false);

    if (error) {
      toast.error(error.message || "Could not send the magic link.");
      return;
    }

    setSentTo(trimmed);
    toast.success("Check your email for the sign-in link.");
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      {authError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Sign-in link expired or was invalid. Request a new one.
        </p>
      ) : null}

      {sentTo ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Link sent to <span className="font-medium">{sentTo}</span>. Open it on
          this device.
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
        Email
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError) setFieldError(null);
          }}
          className={
            fieldError
              ? "h-11 rounded-lg border-2 border-red-500 bg-white px-3 text-base font-normal outline-none"
              : "h-11 rounded-lg border border-[var(--cms-line)] bg-white px-3 text-base font-normal outline-none focus:border-[var(--cms-action)]"
          }
          placeholder="you@example.com"
        />
        {fieldError ? (
          <span className="text-xs font-normal text-red-600">{fieldError}</span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={sending}
        className="h-11 rounded-lg bg-[var(--cms-action)] text-sm font-semibold text-white hover:bg-[var(--cms-action-hover)] disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
