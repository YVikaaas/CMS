const DEFAULT_AFTER_LOGIN = "/dashboard";

const PUBLIC_PATHS = new Set(["/login"]);

/** Safe in-app path after login (blocks open redirects). */
export function safeNextPathAfterLogin(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_AFTER_LOGIN;
  }
  if (next.includes("/login") || next.includes("/auth/callback")) {
    return DEFAULT_AFTER_LOGIN;
  }
  return next;
}

export function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path) || path.startsWith("/auth/callback")) {
    return true;
  }
  if (path.startsWith("/_next") || path === "/favicon.ico") {
    return true;
  }
  return /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(path);
}

export function isOnboardingPath(path: string): boolean {
  return path === "/onboarding";
}

export function isWaitingPath(path: string): boolean {
  return path === "/waiting";
}
