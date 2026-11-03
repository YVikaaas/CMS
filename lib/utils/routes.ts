/** Safe in-app path after login (blocks open redirects). */
export function safeNextPathAfterLogin(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  if (next.includes("/login") || next.includes("/auth/callback")) {
    return "/dashboard";
  }
  return next;
}
