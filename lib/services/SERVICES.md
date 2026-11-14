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
| `listCategories(sportId?)` | optional sport filter | `ServiceResult<Category[]>` | Live categories including parsed `fixtureConfig`. |
| `createCategory(...)` | sport, name, gender, age, sizes, optional fixture type | `ServiceResult<Category>` | Writes `fixture_config`. Athletics formats are `track_rounds` / `field_attempts`; basketball is `league_knockout` / `bracket_elimination`. Athletics roster is forced: solo 1/1, relay 4/4. |
| `updateCategory(id, ...)` | name, gender, age, sizes, fixture type | `ServiceResult<Category>` | Does not change sport. Updates `fixture_config` for the sport's format family. Athletics roster stays 1/1 or relay 4/4. |
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
| `createTeam({ cscId, name, orgName, city, members })` | member count = category `team_size`–`max_team_size` | `ServiceResult<Team>` | Unique live name per CSC. Organization and city are separate optional names. Team and all members take the category gender. Solo athletics is one member (the athlete); relays and basketball are real teams. |
| `importCscTeams(cscId, entries)` | same shape as `createTeam`, many rows | `ServiceResult<{ created, failed }>` | Creates valid rows one by one. Sheet parse/sample lives in `entrySheet.ts`. |
| `updateTeam(id, { name, orgName, city, members })` | — | `ServiceResult<Team>` | Replaces live member set within roster limits. A 1/1 roster updates the existing member in place so heat `athlete_id` rows stay valid. |
| `listTeamMembers(teamId)` | — | `ServiceResult<TeamMember[]>` | Live members. |
| `archiveTeam(id)` | — | `ServiceResult<true>` | Soft-deletes team and members. |
| `listCscOptions({ sportId?, championshipId? })` | — | `ServiceResult<CscOption[]>` | Live CSCs with category name/age, roster min/max, `availableRounds`, `defaultFormat`, `availableFormats`, scoring style, and heat size. |
| `listCscAthletes(cscId)` | CSC id | `ServiceResult<CscAthlete[]>` | Live team members on that championship category, used as heat athletes. |
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
| `createFixture({ cscId, formatType?, rounds, participantsPerMatch?, roundAttempts?, startDate, endDate })` | basketball may pick league vs bracket; athletics format is always the category’s | `ServiceResult<Fixture>` | Unique live fixture per CSC. Inserts chosen rounds. Track `participantsPerMatch` is lanes per heat (2–24). Field `roundAttempts` is 3 in qualifying and 2 in the final unless overridden. |
| `updateFixture(id, { status, startDate, endDate })` | — | `ServiceResult<Fixture>` | Does not change format or rounds. |
| `archiveFixture(id)` | — | `ServiceResult<true>` | Soft-deletes fixture, rounds, matches, sides, player score events, and call-room attendance. |
| `listFixtureMatches(fixtureId)` | — | `ServiceResult<FixtureMatch[]>` | Live matches. Basketball: two team sides. Athletics: heat `participants`. |
| `listChampionshipMatches(championshipId)` | — | `ServiceResult<FixtureMatch[]>` | All live matches across fixtures in that championship. |
| `getFixtureMatch(id)` | — | `ServiceResult<FixtureMatch>` | One live match with sides and scores. |
| `createMatch({ fixtureId, roundId, matchLabel, venue, scheduledAt, status, team1Id, team2Id })` | status `draft` / `scheduled` / `cancelled` | `ServiceResult<FixtureMatch>` | Two different live teams on that CSC. |
| `updateMatch(id, …)` | same as create | `ServiceResult<FixtureMatch>` | Replaces sides. |
| `createHeat({ fixtureId, roundId, matchLabel, venue, scheduledAt, status, athleteIds?, teamIds? })` | 2–N athlete ids, or team ids for relays | `ServiceResult<FixtureMatch>` | Athletics heat/flight. Array index is the lane; blank entries stay empty. Relays insert `team_id` sides. |
| `updateHeat(id, …)` | same as create | `ServiceResult<FixtureMatch>` | Replaces heat athletes or relay teams, keeping lane numbers. |
| `listFixtureRanking(fixtureId)` | fixture id | `ServiceResult<FixtureRankingEntry[]>` | Live manual ranking for that draw, ordered by rank. Includes `medalDeliveredAt`. |
| `saveFixtureRanking(fixtureId, rows)` | `{ rank, teamId? \| athleteId? }[]` | `ServiceResult<FixtureRankingEntry[]>` | Replaces live ranking. Athletics solo uses athletes; basketball and relays use teams. Blocked while ranking is locked. |
| `setFixtureRankingLocked(fixtureId, locked)` | boolean | `ServiceResult<Fixture>` | Lock requires saved 1st, 2nd and 3rd. Unlock is blocked if any of those medals is marked delivered. |
| `saveHeatScore({ matchId, complete, rows })` | per athlete time/mark, result code, attempts, optional qualified | `ServiceResult<FixtureMatch>` | RPC `save_fixture_match_scores` then match `in_progress` / `completed`. Ranks by time or best mark. Non-final auto-qualifies top 8 if qualified is omitted. |
| `archiveMatch(id)` | — | `ServiceResult<true>` | Soft-deletes match, sides, player score events, and call-room attendance. |
| `listMatchScoreEvents(matchId)` | — | `ServiceResult<MatchScoreEvent[]>` | Live 1/2/3 baskets for a match, newest first. |
| `addMatchScoreEvent({ matchId, teamId, teamMemberId, points, scoringMode, team1Fouls?, team2Fouls? })` | points `1` / `2` / `3` | `ServiceResult<FixtureMatch>` | Inserts a basket and refreshes team totals. |
| `archiveMatchScoreEvent(id, scoringMode, fouls?)` | — | `ServiceResult<FixtureMatch>` | Soft-deletes a basket and refreshes totals. |
| `saveMatchScore({ matchId, team1Points, team2Points, team1Fouls, team2Fouls, winner, scoringMode, complete })` | RPC `save_fixture_match_scores`; then status `in_progress` / `completed` | `ServiceResult<FixtureMatch>` | Player/both modes use event sums as team points. Complete auto-picks winner/loser (or league draw) from points if winner is empty. Knockout tie still needs a winner. |

---

## `attendance` — `lib/services/attendance.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `listCallRoomAttendance(matchIds)` | match ids | `ServiceResult<CallRoomAttendanceRow[]>` | Live present/absent rows for those matches. |
| `getCallRoomSheet(match)` | `FixtureMatch` | `ServiceResult<CallRoomSheet>` | Solo heats are athletes. Basketball and relays are teams + members. Team absent makes every player effectively absent. |
| `saveCallRoomSheet(sheet)` | marked present/absent only; unset deletes | `ServiceResult<CallRoomSheet>` | Upserts live rows and restores previously cleared marks. |

---

## `podium` — `lib/services/podium.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `getPodiumSheet(fixtureId)` | fixture id | `ServiceResult<PodiumSheet>` | Ranks 1–3 only. Solo includes athlete name, phone, gender, org, city. Teams include every member. |
| `setPodiumDelivery(rankingId, delivered)` | boolean | `ServiceResult<true>` | Only 1st/2nd/3rd, and only after ranking is locked. |

---

## `dashboard` — `lib/services/dashboard.ts`

| Function | Input | Output | Notes |
|----------|--------|--------|--------|
| `getDashboardSummary(championshipId)` | — | `ServiceResult<DashboardSummary>` | Counts of offered sports, offered categories, and teams in that championship. |
