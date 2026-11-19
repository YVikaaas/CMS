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

type UserWithRoles = UserRow & { user_roles: Array<{ role: string }> | null };
const USER_SELECT = "id, email, full_name, phone, onboarded_at, user_roles!user_roles_user_id_fkey(role)";

/** Signed-in user's id + email from the session JWT (verified locally; no Auth round trip). */
async function sessionIdentity(
  supabase: ReturnType<typeof createClient>,
): Promise<{ id: string; email: string } | null> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return claims?.sub ? { id: claims.sub, email: String(claims.email ?? "").toLowerCase() } : null;
}

async function readAppUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<ServiceResult<AppUser | null>> {
  const { data, error } = await supabase.from("users").select(USER_SELECT).eq("id", userId).maybeSingle<UserWithRoles>();
  if (error) return { data: null, error: toServiceError(error) };
  if (!data) return { data: null, error: null };
  return { data: toAppUser(data, (data.user_roles ?? []).map((row) => row.role as AppRole)), error: null };
}

/** Load the signed-in user; insert the public.users row first only if the auth trigger missed it. */
export async function ensureCurrentUser(): Promise<ServiceResult<AppUser>> {
  const supabase = createClient();
  const identity = await sessionIdentity(supabase);
  if (!identity) return { data: null, error: { message: "Not signed in." } };

  const first = await readAppUser(supabase, identity.id);
  if (first.error) return { data: null, error: first.error };
  if (first.data) return { data: first.data, error: null };

  const { error: upsertError } = await supabase
    .from("users")
    .upsert({ id: identity.id, email: identity.email }, { onConflict: "id", ignoreDuplicates: true });
  if (upsertError) return { data: null, error: toServiceError(upsertError) };

  const created = await readAppUser(supabase, identity.id);
  if (created.error) return { data: null, error: created.error };
  if (!created.data) return { data: null, error: { message: "User record not found." } };
  return { data: created.data, error: null };
}

export async function getCurrentAppUser(): Promise<ServiceResult<AppUser>> {
  const supabase = createClient();
  const identity = await sessionIdentity(supabase);
  if (!identity) return { data: null, error: { message: "Not signed in." } };
  const result = await readAppUser(supabase, identity.id);
  if (result.error) return { data: null, error: result.error };
  if (!result.data) return { data: null, error: { message: "User record not found." } };
  return { data: result.data, error: null };
}

/** Shared write for onboarding and account settings: validates, then updates the signed-in user's row. */
async function writeProfile(
  input: { fullName: string; phone: string },
  extra: { onboarded_at?: string } = {},
): Promise<ServiceResult<AppUser>> {
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
    .update({ full_name: input.fullName.trim(), phone: input.phone.trim(), ...extra })
    .eq("id", user.id)
    .select("id, email, full_name, phone, onboarded_at")
    .single();

  if (error || !data) {
    return { data: null, error: toServiceError(error) };
  }

  const roles = await loadRoles(supabase, user.id);
  return { data: toAppUser(data, roles), error: null };
}

export async function completeOnboarding(input: {
  fullName: string;
  phone: string;
}): Promise<ServiceResult<AppUser>> {
  return writeProfile(input, { onboarded_at: new Date().toISOString() });
}

/** Account settings: change name and phone. Email stays as Auth owns it. */
export async function updateProfile(input: {
  fullName: string;
  phone: string;
}): Promise<ServiceResult<AppUser>> {
  return writeProfile(input);
}
