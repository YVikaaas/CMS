# CMS — shared utilities

Pure helpers and cross-cutting utilities live under `lib/utils/`. **Do not** duplicate this logic in components or services—import from here (or add a new small module and list it below).

**Required:** New modules or significant new exports → add a row here in the **same** change. Cursor rule: `.cursor/rules/cms-mandatory.mdc`.

| Module | Responsibility |
|--------|----------------|
| `cn.ts` | Minimal className merge — filters falsy segments. |
| `fetchWithTimeout.ts` | `fetch` with timeout + `isTimeoutError`. Used by the browser Supabase client. |
| `routes.ts` | `safeNextPathAfterLogin`, `isPublicPath`, onboarding/waiting path helpers. Default after login is `/dashboard`. |
| `slug.ts` | `slugify` for championship slugs. |
| `labels.ts` | `categoryLabel` — Boys/Girls + age group. |
| `nav.ts` | `ADMIN_NAV` sidebar items with page roles for later enforcement. |
| `table.ts` | `toggleSort`, `matchesQuery`, `compareText`, `compareNumber` for table search/sort. |
| `fixtures.ts` | Fixture round labels/order, format labels, knockout presets, round validation, datetime-local helpers, score line / winner helpers. |
| `validation.ts` | Name = letters only; phone = 10 digits starting with 6–9. Score points/fouls = digits only. |
