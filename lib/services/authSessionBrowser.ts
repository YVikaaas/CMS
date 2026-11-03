import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

/** Initial session: getUser then getSession. */
export async function browserAuthGetInitialSession(): Promise<Session | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.warn("Auth check error:", error.message);
    return null;
  }
  if (!user) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export function browserAuthSubscribe(
  onSession: (session: Session | null) => void,
): { unsubscribe: () => void } {
  const supabase = createClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, nextSession) => {
    if (event === "TOKEN_REFRESHED") return;
    onSession(nextSession);
  });
  return { unsubscribe: () => subscription.unsubscribe() };
}

export async function browserAuthSignOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
