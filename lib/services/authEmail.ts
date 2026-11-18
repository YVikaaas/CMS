import { createClient } from "@/lib/supabase/client";
import type { AuthError } from "@supabase/supabase-js";
import { passwordError } from "@/lib/utils/validation";

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

/**
 * Change the signed-in user's password. Re-checks the current password first,
 * because Supabase `updateUser` alone does not.
 */
export async function authChangePassword(params: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ error: { message: string } | null }> {
  const invalid = passwordError(params.newPassword, "New password");
  if (invalid) return { error: { message: invalid } };
  if (params.newPassword === params.currentPassword) {
    return { error: { message: "New password must be different from the current one." } };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: { message: "Not signed in." } };

  const check = await supabase.auth.signInWithPassword({ email: user.email, password: params.currentPassword });
  if (check.error) return { error: { message: "Current password is wrong." } };

  const { error } = await supabase.auth.updateUser({ password: params.newPassword });
  return { error: error ? { message: error.message } : null };
}
