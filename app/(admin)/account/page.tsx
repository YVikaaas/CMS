"use client";

import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { IconLock, IconUserCircle } from "@tabler/icons-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import { fieldClass, fieldErrorClass } from "@/components/Modal";
import { NameInput, PhoneInput } from "@/components/fields";
import { PageHeader, PageSkeleton, SoftButton, StatusBadge } from "@/components/ops";
import { authChangePassword, updateProfile } from "@/lib/services";
import { nameError, passwordError, phoneError } from "@/lib/utils/validation";

type Section = "account" | "security";

function FieldError({ message }: { message?: string }) {
  return message ? <span className="text-xs font-normal text-[var(--ops-danger)]">{message}</span> : null;
}

function initials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function AccountTab() {
  const { appUser, refresh } = useCurrentUser();
  const [fullName, setFullName] = useState(appUser?.fullName ?? "");
  const [phone, setPhone] = useState(appUser?.phone ?? "");
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFullName(appUser?.fullName ?? "");
    setPhone(appUser?.phone ?? "");
    setErrors({});
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = {
      fullName: nameError(fullName, "Full name") ?? undefined,
      phone: phoneError(phone) ?? undefined,
    };
    setErrors(next);
    if (next.fullName || next.phone) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({ fullName, phone });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Profile saved.");
  };

  const name = appUser?.fullName || appUser?.email || "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Card>
        <CardHeader title="Profile" subheader="How you appear to other staff" />
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <Avatar className="size-[120px] bg-[var(--ops-primary)] text-3xl text-[var(--ops-accent)]">
            {initials(name)}
          </Avatar>
          <p className="text-lg font-semibold">{appUser?.fullName || "No name yet"}</p>
          <p className="text-sm text-[var(--ops-text-muted)]">{appUser?.email}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {(appUser?.roles ?? []).map((role) => (
              <StatusBadge key={role} tone="primary">
                {role}
              </StatusBadge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Personal details" subheader="Change your name and phone, then save" />
        <Divider />
        <CardContent>
          <form onSubmit={onSave} className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Full name
              <NameInput
                value={fullName}
                onChange={(value) => {
                  setFullName(value);
                  setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                className={errors.fullName ? fieldErrorClass : fieldClass}
                autoComplete="name"
              />
              <FieldError message={errors.fullName} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Phone
              <PhoneInput
                value={phone}
                onChange={(value) => {
                  setPhone(value);
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                className={errors.phone ? fieldErrorClass : fieldClass}
              />
              <FieldError message={errors.phone} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
              Email
              <input value={appUser?.email ?? ""} disabled className={`${fieldClass} opacity-70`} />
              <span className="text-xs font-normal text-[var(--ops-text-muted)]">
                Email is your sign-in and can&apos;t be changed here.
              </span>
            </label>
            <div className="flex gap-2 sm:col-span-2 sm:justify-end">
              <SoftButton type="submit" variant="primary" loading={saving}>
                Save
              </SoftButton>
              <SoftButton type="button" onClick={reset}>
                Cancel
              </SoftButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityTab() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = {
      current: form.current ? undefined : "Current password is required.",
      next: passwordError(form.next, "New password") ?? undefined,
      confirm: form.confirm !== form.next || !form.confirm ? "Passwords do not match." : undefined,
    };
    setErrors(next);
    if (next.current || next.next || next.confirm) {
      toast.error("Fill the highlighted fields.");
      return;
    }
    setSaving(true);
    const { error } = await authChangePassword({ currentPassword: form.current, newPassword: form.next });
    setSaving(false);
    if (error) {
      if (error.message.startsWith("Current password")) setErrors({ current: error.message });
      toast.error(error.message);
      return;
    }
    setForm({ current: "", next: "", confirm: "" });
    toast.success("Password changed.");
  };

  const field = (key: keyof typeof form, label: string, autoComplete: string) => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input
        type="password"
        value={form[key]}
        onChange={set(key)}
        autoComplete={autoComplete}
        className={errors[key] ? fieldErrorClass : fieldClass}
      />
      <FieldError message={errors[key]} />
    </label>
  );

  return (
    <Card className="max-w-2xl">
      <CardHeader title="Change password" subheader="Confirm your current password, then pick a new one" />
      <Divider />
      <CardContent>
        <form onSubmit={onSave} className="grid gap-5">
          {field("current", "Current password", "current-password")}
          {field("next", "New password", "new-password")}
          {field("confirm", "Confirm new password", "new-password")}
          <div className="flex gap-2">
            <SoftButton type="submit" variant="primary" loading={saving}>
              Change password
            </SoftButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AccountPage() {
  const { appUser, loading } = useCurrentUser();
  // Tab lives in the URL hash so "Security" can be linked to directly. The first paint is the skeleton, so no hydration mismatch.
  const [section, setSection] = useState<Section>(() =>
    typeof window !== "undefined" && window.location.hash === "#security" ? "security" : "account",
  );

  if (loading || !appUser) return <PageSkeleton kind="page" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Account Setting" />
      <Card>
        <Tabs
          value={section}
          onChange={(_, value: Section) => {
            setSection(value);
            window.history.replaceState(null, "", value === "security" ? "#security" : "#");
          }}
          aria-label="Account sections"
          className="px-4"
        >
          <Tab value="account" label="Account" icon={<IconUserCircle size={20} stroke={1.5} />} iconPosition="start" />
          <Tab value="security" label="Security" icon={<IconLock size={20} stroke={1.5} />} iconPosition="start" />
        </Tabs>
        <Divider />
        <CardContent>
          {section === "account" ? <AccountTab key={appUser.id} /> : <SecurityTab />}
        </CardContent>
      </Card>
    </div>
  );
}
