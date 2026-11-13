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
| `nav.ts` | `ADMIN_NAV` (Dashboard + Floor / Setup / Catalog), `NAV_SECTIONS`, `pathTitle`, `needsChampionship`, `isNavItemActive`. |
| `eventFilter.ts` | Shared Floor filters: `cms.eventFilter` in `sessionStorage` (`sportId`, `gender`, `ageGroup`, `categoryId`). Empty string = All (not selected). `isEventFilterSelected` is sport+gender+age. Apply helpers, offered CSC lists, pass helpers, event identity labels. Fixtures EventFilters use `unlockInOrder`. |
| `table.ts` | `toggleSort`, `matchesQuery`, `compareText`, `compareNumber` for table search/sort. |
| `fixtures.ts` | Fixture round labels/order, format labels, knockout presets, round validation, datetime-local helpers, 1/2/3 basket scoring, player-score path, score line / winner / results-board helpers. |
| `resultsBoard.ts` | Public-style results board helpers: match id/when labels, score visibility, knockout column layout and connector paths. |
| `validation.ts` | Name = letters only; phone = 10 digits starting with 6–9. Score points/fouls = digits only. |
