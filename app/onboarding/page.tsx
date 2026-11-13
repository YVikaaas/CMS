"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { completeOnboarding } from "@/lib/services";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import { NameInput, PhoneInput } from "@/components/fields";
import { nameError, phoneError } from "@/lib/utils/validation";

export default function OnboardingPage() {
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nameErr = nameError(fullName, "Full name");
    if (nameErr) {
      toast.error(nameErr);
      return;
    }
    const phoneErr = phoneError(phone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }
    const name = fullName.trim();
    const phoneValue = phone.trim();
    setSaving(true);
    const { data, error } = await completeOnboarding({
      fullName: name,
      phone: phoneValue,
    });
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message || "Could not save your details.");
      return;
    }
    await refresh();
    router.replace(data.isAdmin ? "/dashboard" : "/waiting");
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--cms-action)] text-xl font-semibold text-white">
          C
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Your details</h1>
        <p className="max-w-sm text-center text-sm text-[var(--cms-muted)]">
          Name and phone are required before you can use CMS.
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
          Full name
          <NameInput
            required
            value={fullName}
            onChange={setFullName}
            className="h-11 rounded-lg border border-[var(--cms-line)] bg-white px-3 text-base font-normal outline-none focus:border-[var(--cms-action)]"
            autoComplete="name"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
          Phone
          <PhoneInput
            required
            value={phone}
            onChange={setPhone}
            className="h-11 rounded-lg border border-[var(--cms-line)] bg-white px-3 text-base font-normal outline-none focus:border-[var(--cms-action)]"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="h-11 rounded-lg bg-[var(--cms-action)] text-sm font-semibold text-white hover:bg-[var(--cms-action-hover)] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
