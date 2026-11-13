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
| UI | Ops tokens `#2559db`, kit in `CMS/components/ops/`. No Framer Motion. Do not copy GMS desks (call room, BIB, kit, medals, event-code loaders, weight classes). |
| Filters | Floor pages share `sessionStorage` key `cms.eventFilter`. |

Basketball must keep working. Do not rewrite basketball scoring math, roster min/max, or “one live fixture per CSC”.

---

## 1. Product shape (today)

CMS is an **ops desk** for one championship at a time (header picker).

```text
Catalog          sport  →  category (Boys U16, Girls U14, …)
Setup            championship → offer sports → offer categories → teams → members
Floor            fixtures → scoring → results
```

**Nav** (`CMS/lib/utils/nav.ts`): Dashboard · Floor (Fixtures, Scoring, Results) · Setup (Championships) · Catalog (Sport, Category).

**Championship hops** (keep nested URLs):

```text
/championships
  /[championshipId]/sports
    /[sportId]/categories
      /[categoryId]/teams
        /[teamId]/members
```

**One live fixture per CSC** (`competition_sport_category_map` = championship + sport + category). Example: Basketball · Boys · U16 has at most one draw.

---

## 2. Shared floor filters

File: `CMS/components/ops/EventFilters.tsx`  
Helpers: `CMS/lib/utils/eventFilter.ts`

Three controls: **Sport → Gender → Age**. Age **is** the category (there is no fourth “discipline” chip).

| Page | Filter behaviour |
|------|------------------|
| Fixtures | `unlockInOrder`: Gender disabled until Sport; Age disabled until Gender. Cards hidden until Age is set. Picking Sport on `/gameplay/fixtures` navigates to `/gameplay/fixtures/sport/[sportId]`. |
| Scoring / Results | All three must be set (`isEventFilterSelected`) or the board stays empty. Dropdowns still have an empty “All” value meaning *not selected*. |

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

Teams: one `team` per CSC, members  `team_size`–`max_team_size`, gender copied from category. Services in `CMS/lib/services/teams.ts`.

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

Create-draw modal: format + `RoundChips`. Then `createFixture({ cscId, formatType, rounds, startDate, endDate })`.

Match create: two **different** live teams on that CSC (`createMatch`). Fields: round, match label, venue (default `"Court 1"`), schedule, status (`draft` / `scheduled` / `cancelled` at create), team1, team2.

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

---

## 5. Scoring (complete)

Route: `/gameplay/scoring`  
Old: `/gameplay/scoring/[matchId]/players` → `/gameplay/scoring?match=`

Wait for Sport + Gender + Age. Then **round chips with no All** (first round selected). `SplitWorkspace`: match queue \| `ScoreMatchBoard`. Sticky Save progress / Complete.

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

1. Wait for Sport + Gender + Age (`isEventFilterSelected`).
2. Filter fixtures with `fixturePassesEventFilter` (prefer category `gender` / `ageGroup`, then label).
3. One `CategoryResultsBoard` per remaining fixture.

`CMS/components/results/`:

| File | Job |
|------|-----|
| `CategoryResultsBoard.tsx` | **One** round tab row: League, Quarter Finals, Semis, Final, 3rd Place — only rounds that have matches. **No All.** First round selected. |
| `LeagueResultsBoard.tsx` | Grid of `ResultMatchCard` (no inner tabs). |
| `KnockoutResultsBoard.tsx` | Bracket/cards for the selected knockout round. |
| `ResultMatchCard.tsx` | Public-style card: match id, date/time, two team rows, trophy, points. Live pill if `in_progress`. Scores for `completed` and `in_progress`. |
| `knockoutBoard.css` + `resultsBoard.ts` | Column layout and connector paths. |

Results are **read-only**. No rankings, no medals, no roster popups.

Round order: `sortRoundTypesPresent` in `CMS/lib/utils/resultsBoard.ts` (uses `roundNumber` from `fixtures.ts`).

---

## 7. File map (basketball)

```text
CMS/app/(admin)/gameplay/fixtures/page.tsx
CMS/app/(admin)/gameplay/fixtures/sport/[sportId]/page.tsx
CMS/app/(admin)/gameplay/fixtures/[fixtureId]/page.tsx
CMS/app/(admin)/gameplay/scoring/page.tsx
CMS/app/(admin)/gameplay/results/page.tsx
CMS/components/ScoreMatchBoard.tsx
CMS/components/ops/EventFilters.tsx
CMS/components/results/*
CMS/lib/services/fixtures.ts
CMS/lib/services/catalog.ts
CMS/lib/services/teams.ts
CMS/lib/types/cms.ts
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
| `sport.event_mode` | `team` | `solo` (or `both` if relays later) |
| Participants | Two `team` rows | Many athletes (or relay teams) per heat |
| `participants_per_match` | 2 | typically 8 (heat) / 12+ (flight) |
| Score | integer points + fouls | time (track) or mark + attempts (field) |
| Winner | one of two sides | ordered places; several may **qualify** |
| Rounds | league / QF / SF / Final / 3rd | heat, semi, final (track); qualifying, final (field) |
| Results UI | 1v1 cards + knockout bracket | heat tables / flight lists, times or marks |
| Venue copy | Court | Track / pit / runway |

Do **not** fake athletics by stuffing times into `team1Points`. Do **not** force 2-team `createMatch`.

---

## 9. Athletics — what to add (instruction)

Treat Athletics as a **new scoring family**, branched on sport (or on `fixture.format_type` / `fixture_config.scoring_style`), not a rename of basketball.

### 9.1 Catalog (no schema if you only seed)

1. Master sport: name `Athletics`, code `ATH` (3 letters), `event_mode: "solo"`.
2. Categories: still **gender + age** (Boys U16, Girls U14, …). If you also need event names (100m, Long Jump), that is extra identity. **CMS category today cannot store “100m” separately from age.** Options:
   - **A (ask first):** add an event/discipline field or child table (e.g. 100m under Boys U16). Requires schema — **ask the user**.
   - **B (no schema):** one category per “contest” by stuffing the event into `category.name` / `age_group` (ugly; avoid unless the user agrees).
3. `fixture_config` for athletics categories must **not** be the basketball seed. Example target:

```json
{
  "format": "track_rounds",
  "scoring_style": "time",
  "available_rounds": ["heat", "semi_final", "final"],
  "participants_per_match": 8
}
```

Field events would use `"format": "field_attempts"`, `"scoring_style": "distance"` (or height), rounds `["qualifying", "final"]`.

`createCategory` currently hard-codes basketball `fixture_config`. Athletics needs a sport-aware seed (or an explicit config argument). That is a **service signature/behaviour change** → update `SERVICES.md`.

### 9.2 Participants

Basketball teams are the wrong grain. Athletics needs **solo athletes** (name, org/school, bib optional).

Today CMS only has `team` + `team_member` on a CSC. Options (ask before schema):

- Solo “team of 1” (hack; scoring UI still assumes two sides).
- New `athlete` (or reuse members as heat entries without two-team matches). **Prefer a real solo participant** and matches with N participants.

Until the user approves schema, **do not** invent tables.

### 9.3 Fixture formats (schema likely)

Extend `FixtureFormatType` only after the DB check/enum allows it:

- `track_rounds` — heats with lane order, time, qualify N to next round
- `field_attempts` — flights, best mark from attempts

New `FixtureRoundType` values will need a DB check as well (`heat`, `qualifying`, …). **Ask first.** Helpers in `fixtures.ts` (`FIXTURE_ROUND_TYPES`, `validateFixtureRounds`) must stay in sync with the DB.

Create-draw modal on `fixtures/sport/[sportId]/page.tsx` must branch: basketball → current format + round chips; athletics → heat/flight setup, not QF presets.

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

Keep Sport → Gender → Age gate and one round-tab row **without All**.

Do not use `ResultMatchCard` (1v1) or `KnockoutResultsBoard` for athletics.

Add something like `TrackResultsBoard` / `FieldResultsBoard`:

- Round tabs: Heat, Semi, Final (or Qualifying, Final)
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
- [ ] EventFilters still Sport → Gender → Age; results/scoring still wait for all three
- [ ] Results: one round-tab row, no All
- [ ] Scoring rounds: no All
- [ ] No `createClient` in `app/`
- [ ] SERVICES.md / UTILS.md updated if APIs/helpers changed
- [ ] `npm run build` in `CMS` passes
