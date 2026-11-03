# CMS — API & data services

All **Supabase and backend-facing calls** from UI code should go through modules in `lib/services/`, not ad-hoc `createClient()` + `.from()` / `.auth.` inside components.

**Required:** Any change to exported functions in this folder must update the tables below in the **same** change. Cursor rule: `.cursor/rules/cms-mandatory.mdc`.

Add new operations here and update this file with **inputs** and **outputs**.

---

## `authServer` — `lib/services/authServer.ts` (server-only)

**Import from `@/lib/services/authServer` in Server Components / Route Handlers only** — not from `@/lib/services` (avoids pulling `next/headers` into client bundles).

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `authGetServerUser()` | — | `Promise<User \| null>` | Uses cookie session; for Server Components / `page.tsx`. |
| `authExchangeCodeForSession(code)` | `code`: string | `Promise<{ error: AuthError \| null }>` | PKCE / magic-link exchange used by `/auth/callback`. |

---

## `authSessionBrowser` — `lib/services/authSessionBrowser.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `browserAuthGetInitialSession()` | — | `Promise<Session \| null>` | `getUser` then `getSession`; logs auth errors. |
| `browserAuthSubscribe(onSession)` | `onSession: (Session \| null) => void` | `{ unsubscribe }` | Ignores `TOKEN_REFRESHED` to avoid UI churn. |
| `browserAuthSignOut()` | — | `Promise<void>` | Clears Supabase session (client). |

---

## `authEmail` — `lib/services/authEmail.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `authSendMagicLink` | `{ email, emailRedirectTo }` | `Promise<{ error: AuthError \| null }>` | `signInWithOtp` email; `shouldCreateUser: true`. Redirect must be on the Auth allowlist. |
