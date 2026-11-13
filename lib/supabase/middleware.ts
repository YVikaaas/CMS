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

  let user = null as Awaited<
    ReturnType<typeof supabase.auth.getUser>
  >["data"]["user"];
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
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

  const email = (user.email ?? "").toLowerCase();
  await supabase.from("users").upsert(
    { id: user.id, email },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const { data: row } = await supabase
    .from("users")
    .select("full_name, phone, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

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
