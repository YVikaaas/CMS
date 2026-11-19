import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isOnboardingPath,
  isPublicPath,
  isWaitingPath,
  safeNextPathAfterLogin,
} from "@/lib/utils/routes";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims verifies the session JWT locally when the project uses asymmetric signing keys
  // (one cached JWKS fetch), instead of a round trip to Supabase Auth on every request.
  let user: { id: string; email: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) user = { id: data.claims.sub, email: String(data.claims.email ?? "") };
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  const publicPath = isPublicPath(path);

  if (!user && !publicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (!user) {
    return supabaseResponse;
  }

  // Profile and roles in one query (named FK: user_roles also links users via granted_by).
  type ProfileRow = {
    full_name: string | null;
    phone: string | null;
    onboarded_at: string | null;
    user_roles: Array<{ role: string }> | null;
  };
  const profileQuery = () =>
    supabase
      .from("users")
      .select("full_name, phone, onboarded_at, user_roles!user_roles_user_id_fkey(role)")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

  let { data: row } = await profileQuery();
  if (!row) {
    // First visit after sign-up when the auth trigger missed: create the row once, then read it.
    await supabase.from("users").upsert(
      { id: user.id, email: user.email.toLowerCase() },
      { onConflict: "id", ignoreDuplicates: true },
    );
    ({ data: row } = await profileQuery());
  }
  const roleRows = row?.user_roles ?? [];

  const isOnboarded = Boolean(
    row?.full_name?.trim() && row?.phone?.trim() && row?.onboarded_at,
  );
  const isAdmin = (roleRows ?? []).some((item) => item.role === "admin");

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!isOnboarded && !isOnboardingPath(path) && !path.startsWith("/auth/callback")) {
    return redirectTo("/onboarding");
  }

  if (isOnboarded && isOnboardingPath(path)) {
    return redirectTo(isAdmin ? "/dashboard" : "/waiting");
  }

  if (isOnboarded && !isAdmin && !isWaitingPath(path)) {
    return redirectTo("/waiting");
  }

  if (isAdmin && (isWaitingPath(path) || path === "/login")) {
    const next = safeNextPathAfterLogin(request.nextUrl.searchParams.get("next"));
    return redirectTo(next === "/login" ? "/dashboard" : next);
  }

  if (user && path === "/login" && !isOnboarded) {
    return redirectTo("/onboarding");
  }

  return supabaseResponse;
}
