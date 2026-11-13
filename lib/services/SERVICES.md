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
| `authGetServerAppUser()` | — | `Promise<AppUser \| null>` | Upserts `public.users` for the Auth id, then loads name/phone/roles. |

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
| `authSignInWithPassword` | `{ email, password }` | `Promise<{ error: AuthError \| null }>` | Email + password. No mail sent. |
| `authSendMagicLink` | `{ email, emailRedirectTo }` | `Promise<{ error: AuthError \| null }>` | `signInWithOtp` email; `shouldCreateUser: true`. Redirect must be on the Auth allowlist. |

---

## `users` — `lib/services/users.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `ensureCurrentUser()` | — | `ServiceResult<AppUser>` | Upserts `public.users` keyed to Auth `id`, then returns `getCurrentAppUser()`. |
| `getCurrentAppUser()` | — | `ServiceResult<AppUser>` | `users` row + `user_roles`. `isOnboarded` requires name, phone, `onboarded_at`. |
| `completeOnboarding({ fullName, phone })` | strings | `ServiceResult<AppUser>` | Writes name/phone/`onboarded_at` on the current user. |

---

## `catalog` — `lib/services/catalog.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `listSports()` | — | `ServiceResult<Sport[]>` | Live sports (`deleted_at` null). |
| `createSport({ name, code, eventMode })` | code is 3 letters | `ServiceResult<Sport>` | Admin RLS. |
| `updateSport(id, { name, eventMode })` | — | `ServiceResult<Sport>` | Code is immutable after create. |
| `archiveSport(id)` | — | `ServiceResult<true>` | Soft delete. |
| `listCategories(sportId?)` | optional sport filter | `ServiceResult<Category[]>` | Live categories. |
| `createCategory(...)` | sport, name, gender, age, sizes | `ServiceResult<Category>` | Seeds basketball-style `fixture_config`. |
| `updateCategory(id, ...)` | — | `ServiceResult<Category>` | Does not change sport. |
| `archiveCategory(id)` | — | `ServiceResult<true>` | Soft delete. |

---

## `championships` — `lib/services/championships.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `listChampionships()` | — | `ServiceResult<Championship[]>` | Live `competition` rows. |
| `createChampionship({ name, startDate, endDate, location })` | dates nullable | `ServiceResult<Championship>` | Unique live slug. |
| `updateChampionship(id, ...)` | — | `ServiceResult<Championship>` | Re-slugs from name. |
| `archiveChampionship(id)` | — | `ServiceResult<true>` | Soft delete + status `archived`. |
| `listChampionshipOfferings(championshipId)` | — | `ServiceResult<ChampionshipOffering[]>` | CSM + CSC category ids per sport. |
| `saveChampionshipOfferings(championshipId, offerings)` | `{ sportId, categoryIds[] }[]` | `ServiceResult<true>` | Restores or inserts CSM/CSC. Refuses to drop a category/sport that still has teams or fixtures. |
| `addChampionshipSport(id, sportId)` | — | `ServiceResult<true>` | Assigns a master sport to the championship. |
| `removeChampionshipSport(id, sportId)` | — | `ServiceResult<true>` | Unassigns a sport (blocked if it still has teams). |
| `addChampionshipEvent(id, sportId, categoryId)` | — | `ServiceResult<true>` | Assigns a master category as a sport event. |
| `removeChampionshipEvent(id, categoryId)` | — | `ServiceResult<true>` | Unassigns a sport event (blocked if it still has teams or fixtures). |

---

## `teams` — `lib/services/teams.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `listTeams({ championshipId?, cscId? })` | scoped to a championship or CSC | `ServiceResult<Team[]>` | Teams belong to one championship sport category. |
| `createTeam({ cscId, name, orgName, members })` | member count = category `team_size`–`max_team_size` | `ServiceResult<Team>` | Unique live name per CSC. Team and all members take the category gender. |
| `updateTeam(id, { name, orgName, members })` | — | `ServiceResult<Team>` | Replaces live member set within roster limits. |
| `listTeamMembers(teamId)` | — | `ServiceResult<TeamMember[]>` | Live members. |
| `archiveTeam(id)` | — | `ServiceResult<true>` | Soft-deletes team and members. |
| `listCscOptions({ sportId?, championshipId? })` | — | `ServiceResult<CscOption[]>` | Live CSCs with roster min/max and `availableRounds`. |
| `getTeam(id)` | — | `ServiceResult<Team>` | Live team by id. |
| `createTeamMember(teamId, { name, phone })` | — | `ServiceResult<TeamMember>` | Gender from the team/category. Blocked at max roster. |
| `updateTeamMember(id, { name, phone })` | — | `ServiceResult<TeamMember>` | Live unique name+phone. |
| `archiveTeamMember(id)` | — | `ServiceResult<true>` | Blocked at min roster. |

---

## `fixtures` — `lib/services/fixtures.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `listFixtures(championshipId)` | — | `ServiceResult<Fixture[]>` | One live draw per CSC in that championship. |
| `getFixture(id)` | — | `ServiceResult<Fixture>` | Includes rounds. |
| `createFixture({ cscId, formatType, rounds, startDate, endDate })` | `league_knockout` or `bracket_elimination` | `ServiceResult<Fixture>` | Unique live fixture per CSC. Inserts chosen rounds. |
| `updateFixture(id, { status, startDate, endDate })` | — | `ServiceResult<Fixture>` | Does not change format or rounds. |
| `archiveFixture(id)` | — | `ServiceResult<true>` | Soft-deletes fixture, rounds, matches, sides, and player score events. |
| `listFixtureMatches(fixtureId)` | — | `ServiceResult<FixtureMatch[]>` | Live matches with both team sides, points, fouls, result status. |
| `listChampionshipMatches(championshipId)` | — | `ServiceResult<FixtureMatch[]>` | All live matches across fixtures in that championship. |
| `getFixtureMatch(id)` | — | `ServiceResult<FixtureMatch>` | One live match with sides and scores. |
| `createMatch({ fixtureId, roundId, matchLabel, venue, scheduledAt, status, team1Id, team2Id })` | status `draft` / `scheduled` / `cancelled` | `ServiceResult<FixtureMatch>` | Two different live teams on that CSC. |
| `updateMatch(id, …)` | same as create | `ServiceResult<FixtureMatch>` | Replaces sides. |
| `archiveMatch(id)` | — | `ServiceResult<true>` | Soft-deletes match, sides, and player score events. |
| `listMatchScoreEvents(matchId)` | — | `ServiceResult<MatchScoreEvent[]>` | Live 1/2/3 baskets for a match, newest first. |
| `addMatchScoreEvent({ matchId, teamId, teamMemberId, points, scoringMode, team1Fouls?, team2Fouls? })` | points `1` / `2` / `3` | `ServiceResult<FixtureMatch>` | Inserts a basket and refreshes team totals. |
| `archiveMatchScoreEvent(id, scoringMode, fouls?)` | — | `ServiceResult<FixtureMatch>` | Soft-deletes a basket and refreshes totals. |
| `saveMatchScore({ matchId, team1Points, team2Points, team1Fouls, team2Fouls, winner, scoringMode, complete })` | RPC `save_fixture_match_scores`; then status `in_progress` / `completed` | `ServiceResult<FixtureMatch>` | Player/both modes use event sums as team points. Complete auto-picks winner/loser (or league draw) from points if winner is empty. Knockout tie still needs a winner. |

---

## `dashboard` — `lib/services/dashboard.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `getDashboardSummary(championshipId)` | — | `ServiceResult<DashboardSummary>` | Counts of offered sports, offered categories, and teams in that championship. |
