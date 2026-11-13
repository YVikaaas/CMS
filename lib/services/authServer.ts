import { createClient } from "@/lib/supabase/server";
import type { AuthError, User } from "@supabase/supabase-js";
import type { AppUser } from "@/lib/types/cms";

/** Server-only: current user from cookies (RLS-aware identity). */
export async function authGetServerUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Server-only: exchange a magic-link / PKCE `code` for a cookie session. */
export async function authExchangeCodeForSession(
  code: string,
): Promise<{ error: AuthError | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return { error };
}

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  onboarded_at: string | null;
};

/** Server-only: public.users + roles for proxy gates. */
export async function authGetServerAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const email = (user.email ?? "").toLowerCase();
  await supabase.from("users").upsert(
    { id: user.id, email },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const { data } = await supabase
    .from("users")
    .select("id, email, full_name, phone, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (roleRows ?? []).map((row) => row.role as AppUser["roles"][number]);
  const row = data as UserRow;

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    onboardedAt: row.onboarded_at,
    roles,
    isAdmin: roles.includes("admin"),
    isOnboarded: Boolean(
      row.full_name?.trim() && row.phone?.trim() && row.onboarded_at,
    ),
  };
}
