import { createClient } from "@/lib/supabase/client";
import type { AuthError } from "@supabase/supabase-js";

/** Email + password sign-in (does not send mail). */
export async function authSignInWithPassword(params: {
  email: string;
  password: string;
}): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });
  return { error };
}

/**
 * Send a magic-link email. `emailRedirectTo` must be on the project's Auth allowlist.
 */
export async function authSendMagicLink(params: {
  email: string;
  emailRedirectTo: string;
}): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: params.email,
    options: {
      emailRedirectTo: params.emailRedirectTo,
      shouldCreateUser: true,
    },
  });
  return { error };
}
