# CMS — coding guide for agents and contributors

Use this document when writing or changing code in **CMS**. Prefer matching patterns already in the repo over inventing new ones.

**Enforcement:** Cursor loads **`.cursor/rules/cms-mandatory.mdc`** (`globs: CMS/**/*`). That rule is binding: keep **`SERVICES.md`** / **`UTILS.md`** in sync, no Supabase in `app/`.

---

## Product constraints

- **Supabase:** CMS project `nawznuthyvhmcheevkbf` only. Do not point this app at any other database.
- **Keys:** Browser and SSR clients use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never ship service-role / secret keys to the client.
- **Auth:** Email magic link. Redirect: `/auth/callback`.
- **Dashboard:** `/dashboard` is a signed-in placeholder until features are added.
- **Tables:** Every data table must have **search**, at least one **filter**, and **sortable headers**. Use `TableControls` / `SortTh` (`components/table.tsx`) and `lib/utils/table.ts`. Create/edit on a table page opens in a modal.

---

## Core principles

- **DRY:** Extract shared logic into `lib/services/`, `lib/utils/`, or shared components.
- **KISS:** Smallest change that meets the requirement.
- **YAGNI:** No speculative layers until there is a concrete need.
- **Single responsibility:** One module, one clear job.
- **Read before write:** Match existing naming, imports, and Tailwind patterns.

---

## API & data access (mandatory)

Avoid **inline or in-component** Supabase (`createClient` + `.from` / `.auth`) calls except in **infrastructure** (`lib/supabase/*`, `proxy`).

1. **Services** — Put all app-level API/data calls in [`lib/services/`](./lib/services/) and document them in [`lib/services/SERVICES.md`](./lib/services/SERVICES.md) with **inputs and outputs** whenever you add or change a function.
2. **Imports** — Client code imports from `@/lib/services` (barrel). **Server-only** services (e.g. `authServer` using `next/headers`) must be imported from their file path, e.g. `@/lib/services/authServer`, never re-exported through the client barrel.
3. **Exceptions** — Low-level auth cookie refresh in `lib/supabase/middleware.ts` stays there.

4. **PostgREST limits are not a product limit** — If a feature would depend on awkward client-side pagination, default row caps, large payloads, or many chained `.from()` calls, **add server-side work**: a **`public` SQL/RPC function** (migration + `.rpc()` from a service) or a **Supabase Edge Function**. Document the RPC/edge contract in **`SERVICES.md`**. Never expose **service-role** keys in the browser.

---

## Utilities & helpers

- **Utils** — Pure formatting, validation, route guards: [`lib/utils/`](./lib/utils/). Catalog in [`lib/utils/UTILS.md`](./lib/utils/UTILS.md); update it when you add files.
- **Services vs utils** — Network or persisted data → **services**. Pure functions with no I/O → **utils**.

---

## TypeScript and safety

- Explicit types for public functions and props.
- Avoid `any`; use `unknown` and narrow.
- Handle `null`/`undefined` from network and auth.

---

## React / Next.js

- **`"use client"`** only when hooks, events, or browser APIs are required.
- **`NEXT_PUBLIC_*`** only in the browser; no secrets in client bundles.
- **Middleware / proxy** — Keep session refresh centralized.

---

## Database

- Migrations live in [`supabase/migrations/`](./supabase/migrations/).
- Human-readable log: [`docs/DB_CHANGELOG.md`](./docs/DB_CHANGELOG.md).
- Ask before applying remote schema, RLS, RPC, or Edge Function writes.
