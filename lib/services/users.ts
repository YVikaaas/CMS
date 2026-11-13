import { createClient } from "@/lib/supabase/client";
import type { AppRole, AppUser, ServiceResult } from "@/lib/types/cms";
import { nameError, phoneError } from "@/lib/utils/validation";
import { toServiceError } from "./errors";

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  onboarded_at: string | null;
};

function toAppUser(row: UserRow, roles: AppRole[]): AppUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    onboardedAt: row.onboarded_at,
    roles,
    isAdmin: roles.includes("admin"),
    isOnboarded: Boolean(row.full_name?.trim() && row.phone?.trim() && row.onboarded_at),
  };
}

async function loadRoles(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<AppRole[]> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return (data ?? []).map((row) => row.role as AppRole);
}

/** Insert a public.users row for the signed-in Auth user if the trigger missed. */
export async function ensureCurrentUser(): Promise<ServiceResult<AppUser>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: toServiceError(authError ?? { message: "Not signed in." }) };
  }

  const email = (user.email ?? "").toLowerCase();
  const { error: upsertError } = await supabase.from("users").upsert(
    { id: user.id, email },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (upsertError) {
    return { data: null, error: toServiceError(upsertError) };
  }

  return getCurrentAppUser();
}

export async function getCurrentAppUser(): Promise<ServiceResult<AppUser>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: toServiceError(authError ?? { message: "Not signed in." }) };
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, phone, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { data: null, error: toServiceError(error) };
  }
  if (!data) {
    return { data: null, error: { message: "User record not found." } };
  }

  const roles = await loadRoles(supabase, user.id);
  return { data: toAppUser(data, roles), error: null };
}

export async function completeOnboarding(input: {
  fullName: string;
  phone: string;
}): Promise<ServiceResult<AppUser>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: toServiceError(authError ?? { message: "Not signed in." }) };
  }

  const fullNameErr = nameError(input.fullName, "Full name");
  if (fullNameErr) return { data: null, error: { message: fullNameErr } };
  const phoneErr = phoneError(input.phone);
  if (phoneErr) return { data: null, error: { message: phoneErr } };

  const { data, error } = await supabase
    .from("users")
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("id, email, full_name, phone, onboarded_at")
    .single();

  if (error || !data) {
    return { data: null, error: toServiceError(error) };
  }

  const roles = await loadRoles(supabase, user.id);
  return { data: toAppUser(data, roles), error: null };
}
