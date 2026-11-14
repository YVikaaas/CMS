# CMS — shared utilities

Pure helpers and cross-cutting utilities live under `lib/utils/`. **Do not** duplicate this logic in components or services—import from here (or add a new small module and list it below).

**Required:** New modules or significant new exports → add a row here in the **same** change. Cursor rule: `.cursor/rules/cms-mandatory.mdc`.

| Module | Responsibility |
|--------|----------------|
| `cn.ts` | Minimal className merge — filters falsy segments. |
| `fetchWithTimeout.ts` | `fetch` with timeout + `isTimeoutError`. Used by the browser Supabase client. |
| `routes.ts` | `safeNextPathAfterLogin`, `isPublicPath`, onboarding/waiting path helpers. Default after login is `/dashboard`. |
| `slug.ts` | `slugify` for championship slugs. |
| `labels.ts` | `categoryLabel` — Boys/Girls + age group, plus event name when the category is not a generic sport name. `categoryGroupLabel` is gender + age only. Age/name parsers for labels that include an event. `orgCityLine` joins organization and city. |
| `nav.ts` | `ADMIN_NAV` (Dashboard + Floor / Setup / Catalog), `NAV_SECTIONS`, `pathTitle`, `needsChampionship`, `isNavItemActive`. Floor: Call Room, Fixtures, Scoring, Results, Podium. |
| `eventFilter.ts` | Shared Floor filters: `cms.eventFilter` in `sessionStorage` (`sportId`, `gender`, `ageGroup`, `categoryId`, `categoryName`). Cascade Sport → Gender → Age → Category (`unlockInOrder`; later chips stay disabled until the previous is set). Fixtures: empty chip = All (full list, then narrow). Call Room, Scoring, Results, and Podium wait for `isEventFilterComplete` (all four). Round chips have no All. Scoring ranking is the last chip after the rounds. Identity grows as chips are picked. `namesForSportGenderAge` for setup/catalog name chips. |
| `table.ts` | `toggleSort`, `matchesQuery`, `compareText`, `compareNumber` for table search/sort. |
| `fixtures.ts` | Fixture round labels/order (includes heat/qualifying/QF). Round chips always sort heat → qualifying → league → QF → SF → final → 3rd place (`sortByRoundOrder`, `uniqueRoundLabelsInOrder`). `roundsForFormat` keeps basketball SF/final out of the athletics-only filter. League configs always include league + SF + final. |
| `athletics.ts` | Track rounds are heat → QF → SF → final. Field is qualifying → final with per-round `attemptCount` (default 3 qualifying, 2 final). Relays 4x100m / 4x400m (`defaultAthleticsRoster` 4/4); every other athletics event is solo 1/1 (`isSoloAthleticsEvent`). `clampHeatLanes` for fixture-specific heat size. Heat labels, time/mark parse, ranking. |
| `callRoom.ts` | Present/absent for a match. Solo heats mark athletes. Team matches mark the team and each member. Team absent forces members effectively out; any member present lifts the team; every member absent marks the team absent. |
| `podium.ts` | Top-3 medal helpers. Ranking can lock only when 1st, 2nd and 3rd are set. Podium shows gold/silver/bronze labels and delivery counts. |
| `resultsBoard.ts` | Public-style results board helpers: match id/when labels, score visibility, knockout column layout and connector paths. |
| `validation.ts` | Name = letters only; category/event name = letters, numbers, and spaces (`100m`); phone = 10 digits starting with 6–9. Score points/fouls = digits only. |
| `entrySheet.ts` | Sample Excel + parse for athlete/team import. Athlete file: one row per athlete. Team file: How to fill + Teams sheet; one row per member, same Team name groups the roster. Organization and city are separate columns. |
