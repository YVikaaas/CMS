import { NextResponse } from "next/server";
import { authExchangeCodeForSession } from "@/lib/services/authServer";
import { safeNextPathAfterLogin } from "@/lib/utils/routes";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPathAfterLogin(searchParams.get("next"));

  if (code) {
    const { error } = await authExchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const fail = new URL("/login", origin);
  fail.searchParams.set("error", "auth");
  return NextResponse.redirect(fail);
}
