import { createClient } from "@/lib/supabase/server";
import type { AuthError, User } from "@supabase/supabase-js";

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
