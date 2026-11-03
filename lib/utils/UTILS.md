# CMS — shared utilities

Pure helpers and cross-cutting utilities live under `lib/utils/`. **Do not** duplicate this logic in components or services—import from here (or add a new small module and list it below).

**Required:** New modules or significant new exports → add a row here in the **same** change. Cursor rule: `.cursor/rules/cms-mandatory.mdc`.

| Module | Responsibility |
|--------|----------------|
| `cn.ts` | Minimal className merge — filters falsy segments. |
| `fetchWithTimeout.ts` | `fetch` with timeout + `isTimeoutError`. Used by the browser Supabase client. |
| `routes.ts` | `safeNextPathAfterLogin` — blocks open redirects after login / magic-link callback. |
