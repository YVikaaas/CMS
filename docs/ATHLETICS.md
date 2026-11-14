# CMS — add Athletics (brief for another AI)

**Read this whole file before writing code.** It describes how CMS works **today** (team basketball), then how to add **Athletics** as a second sport with its own fixture, scoring, and results.

Ignore `CMS/docs/SPORT_DISCIPLINE_FIXTURE_SCORING.md` for this work. That file describes a different catalog shape (`discipline` table). **CMS does not have `discipline`.** Identity is `sport` + `category` (gender + age).

---

## 0. Hard rules

| Rule | Detail |
|------|--------|
| App | Next.js app in `CMS/` only. Port `3002`. |
| Database | Supabase project **`nawznuthyvhmcheevkbf` only**. |
| Data access | UI imports `@/lib/services`. **No** `createClient` in `CMS/app/**`. |
| Schema | **Ask the user before** any table, RLS, RPC, or Edge Function write. Save a migration under `CMS/supabase/migrations/` and a top row in `CMS/docs/DB_CHANGELOG.md`. |
| Docs | Same change: `CMS/lib/services/SERVICES.md` if services change; `CMS/lib/utils/UTILS.md` if utils change; `CMS/AGENT_CODING_GUIDE.md` if policy changes. |
| Build | `npm run build` inside `CMS`. User browser-tests. |
| Forms | On Save, red outline every invalid required field (`fieldErrorClass`). One short toast. |
| UI | Ops tokens `#2559db`, kit in `CMS/components/ops/`. No Framer Motion. Do not copy GMS desks (BIB, kit, medals, event-code loaders, weight classes). CMS Call Room is present/absent only. |
| Filters | Floor pages share `sessionStorage` key `cms.eventFilter`. |

Basketball must keep working. Do not rewrite basketball scoring math, roster min/max, or “one live fixture per CSC”.

---

## 1. Product shape (today)

CMS is an **ops desk** for one championship at a time (header picker).

```text
Catalog          sport  →  category (Boys U16, Girls U14, …)
Setup            championship → offer sports → offer categories → athletes (solo) / teams (relay + basketball) → members (teams only)
Floor            call room → fixtures → scoring → results → podium
```

**Nav** (`CMS/lib/utils/nav.ts`): Dashboard · Floor (Call Room, Fixtures, Scoring, Results, Podium) · Setup (Championships) · Catalog (Sport, Category).

**Championship hops** (keep nested URLs):

```text
/championships
  /[championshipId]/sports
    /[sportId]/categories
      /[categoryId]/teams   (Athletes for solo events; Teams for relays)
        /[teamId]/members   (relays and basketball only)
```

**One live fixture per CSC** (`competition_sport_category_map` = championship + sport + category). Example: Basketball · Boys · U16 has at most one draw.

---

## 2. Shared floor filters

File: `CMS/components/ops/EventFilters.tsx`  
Helpers: `CMS/lib/utils/eventFilter.ts`

Four controls: **Sport → Gender → Age → Category**. Age is U16. Category is the event name (100m, Long Jump) or Basketball.

| Page | Filter behaviour |
|------|------------------|
| Fixtures | `unlockInOrder`: Gender disabled until Sport; Age until Gender; Category until Age. Empty chip = All sports/categories. Picking Sport on `/gameplay/fixtures` navigates to `/gameplay/fixtures/sport/[sportId]`. |
| Call Room | Board stays empty until Sport + Gender + Age + Category are all set (`isEventFilterComplete`). Round chips have no All. Solo heats mark athletes present/absent. Basketball and relays mark the team and each member. Team absent puts every player out; a player marked present brings the team back. |
| Scoring | Board stays empty until Sport + Gender + Age + Category are all set (`isEventFilterComplete`). Round chips have no All and stay in heat → QF → SF → final → 3rd order. **Ranking** is the last chip (with a gap after the rounds) and is where places are set. Lock 1st, 2nd and 3rd after save so Podium can open. Field scoring uses that round’s attempt count (default 3 qualifying, 2 final). Each attempt has a **Foul** button (World Athletics **X**, stored as `foul`). All fouls complete as NM. Track times use min / sec / ms selectors (ms two places) and are stored as `time_seconds`. |
| Results | Board stays empty until Sport + Gender + Age + Category are all set (`isEventFilterComplete`). Round tabs have no All, plus a read-only **Ranking** tab. |
| Podium | Board stays empty until Sport + Gender + Age + Category are all set. The category only appears after ranking is locked. Gold / silver / bronze delivery for those three; teams list every member, solo lists athlete details. |

Persisted value:

```ts
{ championshipId, sportId, gender, ageGroup, categoryId }
```

`applySport` clears gender + age + categoryId. `applyGender` clears age + categoryId. `applyAge` sets `categoryId` when sport + gender + age match a category.

---

## 3. Catalog (how a sport exists)

Masters UI: `/masters/sports`, `/masters/categories`.

| Table | Role |
|-------|------|
| `sport` | `name`, 3-letter `code`, `event_mode` (`team` \| `solo` \| `both`) |
| `category` | Belongs to one sport. `gender` (`male`/`female`), `age_group` (e.g. `U16`), `team_size` / `max_team_size`, JSON `fixture_config` |

Display label is always `Boys {age}` or `Girls {age}` (`CMS/lib/utils/labels.ts`). Do not invent a second label system.

`createCategory` currently **always** seeds basketball-style `fixture_config`:

```json
{
  "format": "league_knockout",
  "scoring_style": "simple",
  "available_rounds": ["league", "quarter_final", "semi_final", "final", "third_place"],
  "participants_per_match": 2
}
```

`listCscOptions` reads `available_rounds` from that JSON.

Championship offering: `competition_sport_map` (CSM) + `competition_sport_category_map` (CSC). Services: `addChampionshipSport`, `addChampionshipEvent`, `listChampionshipOfferings`.

Entry: solo athletics events are individual athletes (`team_size`/`max_team_size` = 1, stored as a team-of-1). Relays are teams of 4. Basketball stays a team roster. Gender is copied from the category. Setup can add one by one or import Excel (athlete sample vs team sample). Team sheet: one row per member; the same Team name groups that roster. Services in `CMS/lib/services/teams.ts`.

---

## 4. Fixtures (complete)

### 4.1 Formats and rounds (basketball)

Types in `CMS/lib/types/cms.ts`:

- `FixtureFormatType`: `league_knockout` \| `bracket_elimination`
- `FixtureRoundType`: `league` \| `quarter_final` \| `semi_final` \| `final` \| `third_place`

`league_knockout` = league round **plus** at least one knockout round.  
`bracket_elimination` = knockout only (no `league`). Draws are allowed **only** in league.

Helpers: `CMS/lib/utils/fixtures.ts` (`roundsForFormat`, `validateFixtureRounds`, `roundLabel`, `formatLabel`).

### 4.2 Routes

| URL | What the operator does |
|-----|------------------------|
| `/gameplay/fixtures` | Sport filter only. No category cards. |
| `/gameplay/fixtures/sport/[sportId]` | Gender then Age, then **one card per matching CSC**: create draw, or open existing. |
| `/gameplay/fixtures/[fixtureId]` | Match workspace: round chips (no All), queue \| create/edit match, sticky Save. **No scoring here.** |
| `/gameplay/fixtures/[fixtureId]/matches` | Redirects to `/gameplay/fixtures/[fixtureId]`. |
| `/gameplay/call-room` | Present/absent for the selected match. Solo heats mark athletes. Relays and basketball mark the team and each member. |

Create-draw modal: athletics format comes from the category (no track/field picker). Operator picks rounds, and for track the **lanes per heat**. Field rounds each have their own attempt count (default **3 qualifying, 2 final**). Then `createFixture({ cscId, rounds, participantsPerMatch, roundAttempts, startDate, endDate })`.

Match create: two **different** live teams on that CSC (`createMatch`). Fields: round, match label, venue (default `"Court 1"`), schedule, status (`draft` / `scheduled` / `cancelled` at create), team1, team2.

Athletics heat create: one dropdown per lane/slot (`HeatLaneSlots`). Empty lanes stay blank. Lane number is the row, not checkbox order. Field qualifying has no athlete cap. A final after qualifying is 8 athletes. A direct final (final only, no qualifying) has no cap.

Workspace UI: `CMS/app/(admin)/gameplay/fixtures/[fixtureId]/page.tsx`.

### 4.3 Data tree (basketball)

```text
fixture
  └── fixture_round[]     (chosen round types)
        └── fixture_match[]
              └── two fixture_match_participant rows (team1, team2)
                    score, score_detail { score, fouls, scoring_mode }, result_status
```

Services: `CMS/lib/services/fixtures.ts` — `listFixtures`, `getFixture`, `createFixture`, `updateFixture` (status/dates only; **does not** change format/rounds), `archiveFixture`, `listFixtureMatches`, `listChampionshipMatches`, `createMatch`, `updateMatch`, `archiveMatch`.

`FixtureMatch` in the client is **flattened**: `team1Id`, `team1Name`, `team1Points`, `team1Fouls`, `team1ResultStatus`, same for team2, plus `scoreLine`, `sportName`, `categoryLabel`. There is **no** `categoryId` on the match DTO. Filter results/scoring via fixture `sportId` + `categoryId`, or parse `categoryLabel` (`Boys U16`).

### 4.4 Call Room

Route: `/gameplay/call-room`. Table `fixture_match_attendance` (team row or player row, never both). Team absent makes every member effectively absent; marking a player present lifts the team; marking every player absent marks the team absent. Helpers: `CMS/lib/utils/callRoom.ts`. Service: `CMS/lib/services/attendance.ts`.

---

## 5. Scoring (complete)

Route: `/gameplay/scoring`  
Old: `/gameplay/scoring/[matchId]/players` → `/gameplay/scoring?match=`

Wait for Sport + Gender + Age + Category. Then **round chips with no All** in heat → QF → SF → final → 3rd order (first round selected). `SplitWorkspace`: match queue \| `ScoreMatchBoard`. Sticky Save progress / Complete.

Board: `CMS/components/ScoreMatchBoard.tsx` (modal wrapper `ScoreMatchModal.tsx` still exists).

### 5.1 Basketball score rules (do not change)

- Two teams. Points and fouls are non-negative integers.
- Player baskets: 1 / 2 / 3 via `fixture_match_score_event`. Table `listMatchScoreEvents`, `addMatchScoreEvent`, `archiveMatchScoreEvent`.
- `ScoringMode`: `totals` \| `players` \| `both`. UI currently locks `both`. `officialTeamPoints` in `fixtures.ts`: players mode uses event sum; totals uses typed; both prefers events if any exist.
- Save: `saveMatchScore({ matchId, team1Points, team2Points, team1Fouls, team2Fouls, winner, scoringMode, complete })`.
  - RPC `save_fixture_match_scores(p_match_id, p_scores jsonb)` writes participant score + `score_detail` + `result_status`. **RPC does not set match status.**
  - Service then sets match `in_progress` or `completed`.
- Complete: if winner empty, infer from points. League may be `draw`. Knockout **cannot** draw; a tie needs an explicit winner.
- Cancelled matches cannot be scored.

Winner enum on the client: `"1"` \| `"2"` \| `"draw"`, mapped to participant `result_status` `winner` / `loser` / `draw`.

---

## 6. Results (complete)

Route: `/gameplay/results`  
Page: `CMS/app/(admin)/gameplay/results/page.tsx`

1. Wait for Sport + Gender + Age + Category (`isEventFilterComplete`).
2. Filter fixtures with `fixturePassesEventFilter` (prefer category `gender` / `ageGroup`, then label).
3. One `CategoryResultsBoard` per remaining fixture, with round tabs plus a **Ranking** tab. Ranking is set by hand (`listFixtureRanking` / `saveFixtureRanking`).

`CMS/components/results/`:

| File | Job |
|------|-----|
| `CategoryResultsBoard.tsx` | **One** round tab row: League, Quarter Finals, Semis, Final, 3rd Place — only rounds that have matches. **No All.** First round selected. |
| `LeagueResultsBoard.tsx` | Grid of `ResultMatchCard` (no inner tabs). |
| `KnockoutResultsBoard.tsx` | Bracket/cards for the selected knockout round. |
| `ResultMatchCard.tsx` | Public-style card: match id, date/time, two team rows, trophy, points. Live pill if `in_progress`. Scores for `completed` and `in_progress`. |
| `knockoutBoard.css` + `resultsBoard.ts` | Column layout and connector paths. |

Round results are **read-only**. Ranking on Results is read-only. Medals are on **Podium** after scoring locks 1st–3rd.

### 6.1 Podium

Route: `/gameplay/podium`  
Page: `CMS/app/(admin)/gameplay/podium/page.tsx`

Wait for Sport + Gender + Age + Category. The category only appears after `fixture.rankings_locked_at` is set from the scoring ranking tab (needs saved 1st, 2nd and 3rd). Gold / silver / bronze cards mark medal delivery (`fixture_ranking.medal_delivered_at`). Solo shows athlete name, phone, gender, organization, city. Teams show the team plus every member.

Round order: `sortRoundTypesPresent` in `CMS/lib/utils/resultsBoard.ts` (uses `roundNumber` from `fixtures.ts`).

---

## 7. File map (basketball)

```text
CMS/app/(admin)/gameplay/fixtures/page.tsx
CMS/app/(admin)/gameplay/fixtures/sport/[sportId]/page.tsx
CMS/app/(admin)/gameplay/fixtures/[fixtureId]/page.tsx
CMS/app/(admin)/gameplay/call-room/page.tsx
CMS/app/(admin)/gameplay/scoring/page.tsx
CMS/app/(admin)/gameplay/results/page.tsx
CMS/app/(admin)/gameplay/podium/page.tsx
CMS/components/callRoom/CallRoomBoard.tsx
CMS/components/podium/PodiumBoard.tsx
CMS/components/ScoreMatchBoard.tsx
CMS/components/ops/EventFilters.tsx
CMS/components/results/*
CMS/lib/services/attendance.ts
CMS/lib/services/podium.ts
CMS/lib/services/fixtures.ts
CMS/lib/services/catalog.ts
CMS/lib/services/teams.ts
CMS/lib/types/cms.ts
CMS/lib/utils/callRoom.ts
CMS/lib/utils/podium.ts
CMS/lib/utils/fixtures.ts
CMS/lib/utils/eventFilter.ts
CMS/lib/utils/resultsBoard.ts
CMS/lib/utils/labels.ts
```

Types: `CMS/lib/types/cms.ts`. Services catalog: `CMS/lib/services/SERVICES.md`.

---

## 8. Why Athletics cannot reuse basketball scoring as-is

Basketball is **head-to-head, two teams, points + fouls**.

Athletics is **many athletes in a heat or flight**, ranked by **time** or **distance/height**, with DNS / DNF / DQ / NM. Rounds are heats → semis → final (track) or qualifying → final (field), not QF/SF/Final of a 1v1 bracket.

| | Basketball (now) | Athletics (needed) |
|--|------------------|--------------------|
| `sport.event_mode` | `team` | `solo` (relays still sit on Athletics) |
| Participants | Two `team` rows | Many athletes per heat, or relay teams (4x100m / 4x400m) |
| `participants_per_match` | 2 | typically 8 (heat) / 12+ (flight) |
| Score | integer points + fouls | time (track) or mark + attempts (field) |
| Winner | one of two sides | ordered places; several may **qualify** |
| Rounds | league / QF / SF / Final / 3rd | heat, QF, semi, final (track); qualifying, final (field) |
| Results UI | 1v1 cards + knockout bracket | heat tables / flight lists, times or marks |
| Venue copy | Court | Track / pit / runway |

Do **not** fake athletics by stuffing times into `team1Points`. Do **not** force 2-team `createMatch`.

---

## 9. Athletics — what to add (instruction)

Treat Athletics as a **new scoring family**, branched on sport (or on `fixture.format_type` / `fixture_config.scoring_style`), not a rename of basketball.

### 9.1 Catalog

1. Master sport: name `Athletics`, code `ATH` (3 letters), `event_mode: "solo"`.
2. Categories: **gender + age + event name**. Live unique is `(sport_id, gender, age_group, lower(name))`. Seeded events: 100m, 200m, 400m, 800m, 1500m, 4x100m, 4x400m, Long Jump, High Jump, Shot Put × Boys/Girls × U14/U16/U18. Solo events roster 1/1 (athletes enter). Relays roster 4/4 and heat lanes are teams. Floor filters are Sport → Gender → Age → Category.
3. `fixture_config` for athletics categories must **not** be the basketball seed. Track events use `track_rounds` / `time`; field events use `field_attempts` / `distance` or `height`. Example target:

```json
{
  "format": "track_rounds",
  "scoring_style": "time",
  "available_rounds": ["heat", "quarter_final", "semi_final", "final"],
  "participants_per_match": 8
}
```

Field events would use `"format": "field_attempts"`, `"scoring_style": "distance"` (or height), rounds `["qualifying", "final"]`.

`createCategory` currently hard-codes basketball `fixture_config`. Athletics needs a sport-aware seed (or an explicit config argument). That is a **service signature/behaviour change** → update `SERVICES.md`.

### 9.2 Participants

Solo events: athletes enter (name, phone, org). Stored as `team` + one `team_member` so heat `athlete_id` rows stay on `team_member`. Relays and basketball: teams enter, then members. Setup UI hides the members hop for roster 1/1.

### 9.3 Fixture formats (schema likely)

Extend `FixtureFormatType` only after the DB check/enum allows it:

- `track_rounds` — heats with lane order, time, qualify N to next round
- `field_attempts` — flights, best mark from attempts

New `FixtureRoundType` values will need a DB check as well (`heat`, `qualifying`, …). **Ask first.** Helpers in `fixtures.ts` (`FIXTURE_ROUND_TYPES`, `validateFixtureRounds`) must stay in sync with the DB.

Create-draw modal on `fixtures/sport/[sportId]/page.tsx`: basketball may pick league vs bracket + rounds. Athletics does **not** pick track vs field — that is the category `fixture_config.format`. Athletics asks for rounds and, on track, lanes per heat.

Match workspace must allow **N athletes per heat**, not two team dropdowns. Default venue `"Track 1"` / `"Pit 1"`, not `"Court 1"`.

### 9.4 Scoring

New board, do not overload `ScoreMatchBoard` with basketball + athletics in one form.

**Track**

- Per athlete: time (or DNS / DNF / DQ), place, qualified yes/no.
- Persist in `score` / `score_detail` JSON (e.g. `{ time_ms, place, result_status }`) via a **new RPC or an extended** `save_fixture_match_scores`. Current RPC is two-sided basketball. **Ask before changing the RPC.**

**Field**

- Per athlete: attempts[], best mark, unit (m / cm), NM / FOUL / DNS / DQ, place.

Complete heat: all athletes have a status; qualification rules are sport-config (e.g. top 8 times), not “winner of two teams”.

Scoring page: same EventFilters. Round chips = heat / semi / final (no All). Queue = heats. Board = the athletics scorer.

### 9.5 Results

Keep Sport → Gender → Age → Category gate and one round-tab row **without All**.

Do not use `ResultMatchCard` (1v1) or `KnockoutResultsBoard` for athletics.

Add something like `TrackResultsBoard` / `FieldResultsBoard`:

- Round tabs: Heat, Quarter Finals, Semi, Final (or Qualifying, Final)
- Each heat: table of athletes, mark/time, place, Qualified mark
- Read-only
- Inspiration for layout only: public `TrackRoundsResultsView` (heats + times). **Do not copy** that app’s files or GMS ops kit.

`CategoryResultsBoard` should switch on `fixture.formatType` (or sport code `ATH`):

- `league_knockout` / `bracket_elimination` → current basketball boards
- `track_rounds` / `field_attempts` → athletics boards

### 9.6 Suggested implementation order

1. **Plan + user permission** for any DB enum/table/RPC.
2. Catalog: Athletics sport + categories + athletics `fixture_config` seed.
3. Types + `fixtures.ts` round/format helpers (and SERVICES.md / UTILS.md).
4. Fixture create + heat list UI (N participants).
5. Scoring board + save path.
6. Results boards + `CategoryResultsBoard` branch.
7. `npm run build` in `CMS`.

If the user has not approved schema yet: **stop after a written plan** that shows current vs proposed tables. Do not insert athletics rows that assume basketball `participants_per_match: 2`.

---

## 10. Branching rule (keep basketball intact)

```text
if format is league_knockout or bracket_elimination
  → existing fixtures workspace, ScoreMatchBoard, ResultMatchCard / knockout
else if format is track_rounds or field_attempts
  → athletics heat/flight UI
else
  → empty “unsupported format”
```

Key off **`fixture.formatType` / `fixture_config`**, not `if (sportName === "Basketball")`, except for copy (Court vs Track).

---

## 11. Completion checklist (athletics)

- [ ] User approved any DB/RPC change; migration + `DB_CHANGELOG.md`
- [ ] Basketball create/score/results still work
- [ ] EventFilters still Sport → Gender → Age → Category; results/scoring still wait for all four
- [ ] Results: one round-tab row, no All
- [ ] Scoring rounds: no All
- [ ] No `createClient` in `app/`
- [ ] SERVICES.md / UTILS.md updated if APIs/helpers changed
- [ ] `npm run build` in `CMS` passes
