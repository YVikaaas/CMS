# CMS — coding guide for agents and contributors

Use this document when writing or changing code in **CMS**. Prefer matching patterns already in the repo over inventing new ones.

**Enforcement:** Cursor loads **`.cursor/rules/cms-mandatory.mdc`** (`globs: CMS/**/*`). That rule is binding: keep **`SERVICES.md`** / **`UTILS.md`** in sync, no Supabase in `app/`.

---

## Product constraints

- **Supabase:** CMS project `nawznuthyvhmcheevkbf` only. Do not point this app at any other database.
- **Keys:** Browser and SSR clients use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never ship service-role / secret keys to the client.
- **Auth:** Email magic link + password + onboarding. Redirect: `/auth/callback`. No phone OTP.
- **Dashboard:** Numbered command steps from `getDashboardSummary`. Links land on the first hop of each flow (championship sports, fixtures sports board, scoring/results with filters empty).
- **Tables (catalog):** Masters Sport / Category keep CRUD tables. Search + at least one filter + sortable headers (`SoftSearch` / `ChipFilter` / `SortTh` + `lib/utils/table.ts`). Create/edit opens in a modal. On Save, mark every invalid field with `fieldErrorClass` (red outline) and a short toast — do not toast-only.
- **Ops UI:** Tablet-first desk. **Design system:** [`.interface-design/system.md`](./.interface-design/system.md) (tokens, kit, screen patterns). Tokens in `app/globals.css` (`--ops-*`, primary `#2559db`). Shared kit: `components/ops/` (`SoftButton`, `SoftCard`, `EventFilters`, `SplitWorkspace`, …). CSS press (150ms) only — no Framer Motion. Do not copy GMS-only desks (call room, BIB, kit, verification, medals, event-code loaders, weight classes).
- **Floor filters:** Fixtures, Scoring, and Results share `sessionStorage` key `cms.eventFilter` via `lib/utils/eventFilter.ts`. Chips are **Sport → Gender → Age** (age = category). Fixtures uses `unlockInOrder`: Gender stays disabled until Sport, Age until Gender; category cards wait until Age is set. Scoring/Results keep All as unselected and stay empty until all three are picked. Scoring round chips have no All — one round stays selected.
- **Setup hops:** Championships stay nested pages (list → sports → categories → teams → members). Each page is the next board, with `StepCrumbs`. Do not flatten into one workspace.
- **Nav:** Dashboard, then Floor (Fixtures / Scoring / Results), Setup (Championships), Catalog (Sport / Category). Floor and dashboard wait on a selected championship; masters stay ungated.

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
