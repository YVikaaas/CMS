"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { completeOnboarding } from "@/lib/services";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import { NameInput, PhoneInput } from "@/components/fields";
import { SoftButton } from "@/components/ops";
import { fieldClass, fieldErrorClass } from "@/components/Modal";
import { nameError, phoneError } from "@/lib/utils/validation";

export default function OnboardingPage() {
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; phone?: string }>({});

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { fullName?: string; phone?: string } = {};
    const nameErr = nameError(fullName, "Full name");
    if (nameErr) nextErrors.fullName = nameErr;
    const phoneErr = phoneError(phone);
    if (phoneErr) nextErrors.phone = phoneErr;
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    setSaving(true);
    const { data, error } = await completeOnboarding({
      fullName: fullName.trim(),
      phone: phone.trim(),
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
    <main className="ops-page-enter flex min-h-dvh flex-col items-center justify-center bg-[var(--ops-bg)] px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--ops-line)] bg-[var(--ops-surface)] p-8 shadow-[var(--ops-shadow-card)]">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ops-primary)] text-xl font-semibold text-white">
            C
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Your details</h1>
          <p className="max-w-sm text-center text-sm text-[var(--ops-text-muted)]">
            Name and phone are required before you can use CMS.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--ops-text)]">
            Full name
            <NameInput
              required
              value={fullName}
              onChange={(value) => {
                setFullName(value);
                setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              className={fieldErrors.fullName ? fieldErrorClass : fieldClass}
              autoComplete="name"
            />
            {fieldErrors.fullName ? (
              <span className="text-xs font-normal text-[var(--ops-danger)]">{fieldErrors.fullName}</span>
            ) : null}
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--ops-text)]">
            Phone
            <PhoneInput
              required
              value={phone}
              onChange={(value) => {
                setPhone(value);
                setFieldErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              className={fieldErrors.phone ? fieldErrorClass : fieldClass}
            />
            {fieldErrors.phone ? (
              <span className="text-xs font-normal text-[var(--ops-danger)]">{fieldErrors.phone}</span>
            ) : null}
          </label>
          <SoftButton type="submit" variant="primary" loading={saving}>
            Continue
          </SoftButton>
        </form>
      </div>
    </main>
  );
}
