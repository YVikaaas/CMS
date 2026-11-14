"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authSendMagicLink, authSignInWithPassword } from "@/lib/services";
import { safeNextPathAfterLogin } from "@/lib/utils/routes";
import { cn } from "@/lib/utils/cn";
import { SoftButton } from "@/components/ops";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const inputClass = "ops-control w-full text-base";

export default function EmailMagicLinkForm() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeNextPathAfterLogin(searchParams.get("next")),
    [searchParams],
  );
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"password" | "link" | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const trimmedEmail = () => email.trim().toLowerCase();

  const onPasswordSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = trimmedEmail();
    if (!isValidEmail(trimmed) || !password) {
      setFieldError("Enter email and password.");
      toast.error("Fill the highlighted fields.");
      return;
    }
    setBusy("password");
    const { error } = await authSignInWithPassword({
      email: trimmed,
      password,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message || "Could not sign in.");
      return;
    }
    window.location.href = nextPath;
  };

  const onSendLink = async () => {
    const trimmed = trimmedEmail();
    if (!isValidEmail(trimmed)) {
      setFieldError("Enter a valid email.");
      toast.error("Fill the highlighted fields.");
      return;
    }
    setBusy("link");
    const redirect = new URL("/auth/callback", window.location.origin);
    redirect.searchParams.set("next", nextPath);
    const { error } = await authSendMagicLink({
      email: trimmed,
      emailRedirectTo: redirect.toString(),
    });
    setBusy(null);
    if (error) {
      toast.error(error.message || "Could not send the magic link.");
      return;
    }
    setSentTo(trimmed);
    toast.success("Check your email for the sign-in link.");
  };

  return (
    <form onSubmit={onPasswordSignIn} className="flex w-full max-w-sm flex-col gap-4">
      {authError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Sign-in link expired or was invalid. Request a new one, or use your
          password.
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
          className={cn(inputClass, fieldError && "ops-control-error")}
          placeholder="you@example.com"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
        {fieldError ? (
          <span className="text-xs font-normal text-red-600">{fieldError}</span>
        ) : null}
      </label>

      <SoftButton type="submit" variant="primary" loading={busy === "password"} disabled={busy !== null}>
        Sign in
      </SoftButton>

      <SoftButton type="button" loading={busy === "link"} disabled={busy !== null} onClick={() => void onSendLink()}>
        Send magic link instead
      </SoftButton>
    </form>
  );
}
