# Sport, discipline, fixture, scoring, and results

**Who this is for:** an agent or engineer with no prior file context who must understand how basketball (and the shared model around it) is stored and used, then rebuild or operate the same ideas.

**What this is:** the data model for

`sport → discipline → championship offering → team → fixture → match score → ranking / medal → public results`

**What this is not:** a dump of an existing database. Recreate the **shape**, not copied ids.

**Primary walkthrough sport:** Basketball (`BKB`). Other sports share the same tables; they differ in `format_type`, `scoring_style`, and whether the participant is an athlete or a team.

---

## 1. Mental model

There are **four layers**. Do not collapse them.

| Layer | Tables | Meaning |
| --- | --- | --- |
| **Catalog** | `sport`, `discipline` | Global master list. Exists once for the whole platform. Basketball is one sport with 12 category rows. |
| **Championship offering** | `competition`, `competition_sport_map` (CSM), `competition_sport_discipline_map` (CSDM) | Which catalog rows this event actually runs, with venue, dates, prices, capacity, cancel flags. |
| **People** | paid registration → `team` / `team_member` (team sports) or athlete rows (solo) | Who is eligible to appear on a court. |
| **On-ground result** | `fixture` → `fixture_round` → `fixture_match` → `fixture_match_participant` → `fixture_ranking` | Draw, scores, winner/loser, medals. |

Basketball is a **team knockout** sport in practice:

- Catalog says the *default template* is `league_knockout` + `simple` scoring.
- In practice, championship fixtures are often **`bracket_elimination`** (no league groups), still **`simple`** scoring (points + fouls, not sets).
- One **fixture per category** (e.g. Boys U14). That fixture owns all rounds (QF / SF / Final / 3rd Place) and all matches.
- Each match has **two team participants**. Score is a basketball scoreline. Winner/loser is an enum, not inferred only from points.
- Medals live on **`fixture_ranking` as teams**, then lock. Public pages only trust **locked** ranks.

```text
sport (Basketball, BKB)
  └── discipline × 12  (same name "Basketball", split by gender + age)
        └── CSDM (this championship offers that category)
              └── team (school squad for that category)
                    └── fixture (one draw for that category)
                          └── fixture_round (semi_final, final, third_place, …)
                                └── fixture_match (Match 6 on Court 1)
                                      └── fixture_match_participant × 2 (teams)
                          └── fixture_ranking (gold / silver / bronze teams)
```

---

## 2. Catalog — `sport`

Master sport. Soft-deleted with `deleted_at`. Never create a second "Basketball" row.

### Basketball sport row

| Field | Value |
| --- | --- |
| `name` | `Basketball` |
| `code` | `BKB` (exactly 3 letters) |
| `event_mode` | `team` (not `solo`, not `both`) |
| `cover_image` / `icon_url` | marketing assets |
| `sport_guidelines` / `guidelines_pdf_url` | rules PDF / JSON |

Other useful sport flags (used at registration, not scoring):

- `is_cross_age_group_allowed`, `is_higher_age_group_allowed`, `is_multicategory_allowed`
- `max_solo_discipline_allowed`, `max_team_discipline_allowed`
- `event_mode` enum: `solo` \| `team` \| `both`

**Rule:** scoring UI does **not** key off `sport.name` for format. It keys off `fixture.format_type` + `scoring_style`. The name is only used for copy (e.g. "Basketball" in `score_detail.sport`) and a few venue helpers (courts vs tracks).

---

## 3. Catalog — `discipline`

A discipline is **one contest category**, not a different game.

For Basketball the **name is always `Basketball`**. The identity is **gender + age group**.

Code format (platform-wide):

```text
{SPORT}-{GENDER}-{AGE}-{DISC}
```

- `SPORT` = 3-letter sport code (`BKB`)
- `GENDER` = `B` male / `G` female
- `AGE` = digits from `U11` → `11`
- `DISC` = short name. When the discipline name *is* the sport, DISC repeats the sport code (`BKB`)

Example: Boys U14 Basketball → **`BKB-B-14-BKB`**.

### Basketball disciplines (12 categories)

`team_size` = players who take the court (5). `max_team_size` = roster cap (6 for most ages, 15 for U17/U19).

`age_min` is stored as `4` on every basketball row (platform floor). **Eligibility is `age_max` vs championship `eligibility_year`**, not "must be at least 4".

| code | gender | age | age_max | team_size | max_team_size |
| --- | --- | --- | --- | --- | --- |
| `BKB-B-11-BKB` | male | U11 | 10 | 5 | 6 |
| `BKB-G-11-BKB` | female | U11 | 10 | 5 | 6 |
| `BKB-B-14-BKB` | male | U14 | 13 | 5 | 6 |
| `BKB-G-14-BKB` | female | U14 | 13 | 5 | 6 |
| `BKB-B-16-BKB` | male | U16 | 15 | 5 | 6 |
| `BKB-G-16-BKB` | female | U16 | 15 | 5 | 6 |
| `BKB-B-17-BKB` | male | U17 | 16 | 5 | 15 |
| `BKB-G-17-BKB` | female | U17 | 16 | 5 | 15 |
| `BKB-B-18-BKB` | male | U18 | 17 | 5 | 6 |
| `BKB-G-18-BKB` | female | U18 | 17 | 5 | 6 |
| `BKB-B-19-BKB` | male | U19 | 18 | 5 | 15 |
| `BKB-G-19-BKB` | female | U19 | 18 | 5 | 15 |

### Columns that matter for fixtures

| Column | Basketball | How it is used |
| --- | --- | --- |
| `sport_id` | Basketball sport UUID | Join to sport |
| `name` | `Basketball` | Display. Do not use name alone as identity |
| `gender` | `male` / `female` | Category |
| `age_group` | `U11`…`U19` | Category |
| `team_size` | `5` | **`team_size > 1` ⇒ team discipline.** The scoring desk treats the participant as `team_id`, not `athlete_id` |
| `max_team_size` | 6 or 15 | Roster cap at team creation |
| `code` | `BKB-*-BKB` | Stable human key |
| `fixture_config` | JSON template (below) | Defaults when creating a fixture. **Not** the live draw |
| `scoring_schema` | `null` | Unused for basketball. Do not invent one |
| `primary_metric` / `metric_dir` | `null` | Used by track/field (time lower / distance higher). Basketball ignores these |
| `deleted_at` | null if live | Soft delete |

### `discipline.fixture_config` (template, not the fixture)

Every basketball discipline has:

```json
{
  "format": "league_knockout",
  "scoring_style": "simple",
  "available_rounds": ["league", "quarter_final", "semi_final", "final", "third_place"],
  "participants_per_match": 2
}
```

Meaning:

- **Template default format** is league-then-knockout. Staff may still create a **pure knockout** fixture (`bracket_elimination`) — that is the usual on-ground choice.
- **`scoring_style: simple`** is why basketball uses the points+fouls UI, not badminton sets.
- **`available_rounds`** is the menu. The fixture stores the **chosen** rounds in `fixture.config.active_rounds`.
- **`participants_per_match: 2`** = two sides (Team A vs Team B).

**Resolution order for scoring UI** (`resolveFixtureScoringStyle`):

1. `fixture.config.scoring_style` if set (`simple` or `sets`)
2. else `discipline.fixture_config.scoring_style`
3. else if `format_type = bracket_elimination` → **`sets`** (racket default)
4. else if `format_type = league_knockout` → **`simple`**

If a knockout fixture omits `scoring_style` on `fixture.config`, it can still score as **simple** because the discipline template has it. If you forget both, the desk falls back to the **sets** form (racket default). **Always copy `scoring_style: "simple"` onto `fixture.config` for basketball.**

---

## 4. Championship offering

A championship is one `competition` row (name, slug, dates, flags).

### `competition_sport_map` (CSM) — sport offered at this event

One row per (competition, sport). Key flags:

| Column | Role |
| --- | --- |
| `is_active_public` / `is_active_admin` | Registration visibility |
| `is_cancelled` | Sport dropped |
| `deleted_at` | Soft remove |
| `event_location`, `event_start_date`, `event_end_date` | Venue + dates for the sport |
| `venue_direction_url`, `venue_facility_id` | Maps |
| `individual_event_price` / `team_event_price` | Fees (basketball uses team price) |
| `is_fixture_active` | The fixtures board shows this sport |
| `is_fixture_published` / `fixture_url` | Public schedule link |

Basketball only appears on the fixtures board when **CSM `is_fixture_active = true`**.

### `competition_sport_discipline_map` (CSDM) — category offered at this event

One row per (CSM, discipline). Integer `id` (bigint). The fixture **must** store this id in `fixture.competition_sport_discipline_map_id`.

| Column | Role |
| --- | --- |
| `competition_sport_id` | FK to CSM |
| `discipline_id` | Which category |
| `is_active` | Offered |
| `is_cancelled` | Category dropped (refunds / hide) |
| `reg_max` / `reg_current` | Capacity |
| `discipline_order` | Admin sort |
| `deleted_at` | Soft remove |

A championship does **not** automatically offer all 12 basketball categories. A city may offer only U11/U14/U16/U18 (not U17/U19). Only offered CSDM rows get a fixture.

---

## 5. People — registration and teams

### Registration

Athletes buy a **discipline** (CSDM), not a fixture. Paid items are later synced into a championship roster. That roster is who coaches may put on a team.

### `team` / `team_member` (basketball participants)

Basketball match sides are **teams**, not athletes.

`team`:

| Column | Rule |
| --- | --- |
| `competition_id` + `discipline_id` | Squad is scoped to one category in one event |
| `school_id` | Organization |
| `coach_user_id` | Owner |
| `name` | Display name on the scoring desk |
| `gender` | `male` / `female` |
| `is_locked` | Coach cannot edit roster after lock / championship `is_team_creation_locked` |

`team_member`:

- `athlete_id` + `position` + `is_captain`
- Unique `(team_id, athlete_id)`
- Trigger: one athlete may be on **only one team** for the same `(competition, discipline)`

**On the fixture, we store `team_id` only.** Athlete ids are not written on `fixture_match_participant` for basketball. Call Room can still mark **members** present via `fixture_match_member_attendance` (`fixture_match_participant_id` + `athlete_id`).

Desk rule used everywhere:

```text
isTeamDiscipline = (discipline.team_size ?? 0) > 1
```

Basketball `team_size = 5` → team mode. Athletics 100m `team_size = 1` → athlete mode. Relays are athlete/team hybrids; do not copy basketball onto them.

---

## 6. Fixture tree

### 6.1 `fixture` — one draw per category

| Column | Basketball practice |
| --- | --- |
| `competition_id` | Championship |
| `discipline_id` | e.g. Boys U14 |
| `competition_sport_discipline_map_id` | Matching CSDM bigint |
| `format_type` | Usual draw: `bracket_elimination`. Template default: `league_knockout` |
| `config` | JSON — chosen rounds + `participants_per_match` |
| `status` | `draft` → `published` → `in_progress` → `completed` |
| `start_date` / `end_date` | Category window (date only) |
| `rankings_locked` | When `true`, medals cannot be rewritten |
| `is_autofill_enabled` | Bracket winner-feeds-next-round. Optional |
| `weight_class_key` | **null for basketball.** Used by Judo/Taekwondo (many fixtures per discipline) |
| `created_by` | Auth user |

**Uniqueness**

- No weight class: **one fixture per `(competition_id, discipline_id)`**
- With `weight_class_key`: one fixture per `(competition, discipline, weight_class_key)` — combat sports only

Do not create two basketball fixtures for the same Boys U14.

### `fixture_format_type` enum

| Value | Typical sports | Basketball? |
| --- | --- | --- |
| `bracket_elimination` | Knockout (basketball, badminton, volleyball) | **Yes (usual)** |
| `league_knockout` | Group stage + knockout (template default) | Template only unless staff pick it |
| `track_rounds` | Athletics / skating / swim heats | No |
| `field_attempts` | LJ / SP / JT | No |
| `swiss_system` | Chess | No |
| `judge_score` | Kata / yoga / gymnastics | No |
| `archery` | Qualification + knockout | No |

### `fixture_status` enum

`draft` | `published` | `in_progress` | `completed`

### Basketball `fixture.config` examples

```json
{ "active_rounds": ["semi_final", "final"], "participants_per_match": 2 }
```

```json
{ "active_rounds": ["quarter_final", "semi_final", "final", "third_place"], "participants_per_match": 2 }
```

Preferred when creating new basketball fixtures (includes scoring_style):

```json
{
  "active_rounds": ["quarter_final", "semi_final", "final", "third_place"],
  "participants_per_match": 2,
  "scoring_style": "simple"
}
```

`active_rounds` must match the `fixture_round.round_type` rows you insert. The desk treats that list as the selected knockout skeleton.

### 6.2 `fixture_round`

| Column | Notes |
| --- | --- |
| `fixture_id` | Parent draw |
| `round_type` | Stable key: `quarter_final`, `semi_final`, `final`, `third_place`, `league`, `r32`, … |
| `round_number` | Order (1 = earliest) |
| `round_label` | Display: `Quarter Finals`, `3rd Place` |
| `status` | Same enum as matches (`draft` default) |
| `event_date` | Date of that round |
| `event_time` | Time without TZ (pair with `event_date`) |
| Unique | `(fixture_id, round_type)` — one row per type |

Basketball does **not** use `advancement_count` / `qualifying_mark` (field/track).

### 6.3 `fixture_match`

| Column | Notes |
| --- | --- |
| `fixture_round_id` | Parent round |
| `match_number` | Unique per round (1, 2, 3…) |
| `match_label` | Human label from the schedule (`Match 6`) — not the same as `match_number` |
| `venue` | Free text. Basketball uses `Court 1` / `Court 2` |
| `scheduled_at` | timestamptz (store the local tip-off with offset) |
| `status` | `draft` \| `scheduled` \| `in_progress` \| `completed` \| `cancelled` \| `no_show` |
| `is_ready` | Call-room / desk readiness |
| `weight_category_id` | null for basketball |
| Unique | `(fixture_round_id, match_number)` |

`match_label` is what staff say ("Match 22"). `match_number` is the slot inside the round (QF match 1 vs QF match 2). Do not treat them as the same.

### 6.4 `fixture_match_participant`

Exactly one of `athlete_id` or `team_id` (check constraint). Basketball: **`team_id` only**.

| Column | Basketball |
| --- | --- |
| `team_id` | The school team |
| `athlete_id` | always null |
| `participant_label` | `"1"` or `"2"` = court side. Older rows may be null; then order is insertion order |
| `score` | Combined line on **both** rows, e.g. `"16-21"` (side1-side2) |
| `score_detail` | Per-side JSON (below) |
| `result_status` | `winner` / `loser` / `bye` / `pending` / … |
| `position` | unused for basketball (track/field places) |
| `attempts` | unused (`[]`) |
| `call_room_status` / `call_room_photo_url` | team-level call room |

`fixture_participant_result` enum:

`winner` | `loser` | `draw` | `dns` | `dnf` | `dq` | `bye` | `pending` | `no_show` | `qualified`

Knockout basketball uses **`winner` + `loser`**. A one-team slot uses **`bye`**. Do not leave a knockout match `completed` with both sides `pending` — require a winner before complete.

Placeholder / TBD: a participant row may exist with `team_id` null **only if** you temporarily violate the check — we do **not**. Unassigned sides are simply **missing participant rows**, or a label-only flow in the UI (`HeadToHeadTbdPanel`). Seeds used `participant_label` text like `"Winner Match X"` only as comments in SQL, not as a stored pattern you must copy. Prefer real `team_id` or empty match.

### 6.5 `fixture_ranking` — medals

One table for every sport. Basketball rows are **teams**.

| Column | Basketball |
| --- | --- |
| `fixture_id` | The category draw |
| `rank` | `1` gold, `2` silver, `3` bronze. Unique per fixture (when no weight class) |
| `team_id` | set |
| `athlete_id` | null |
| `medal` | `gold` \| `silver` \| `bronze` \| null |
| `final_score` | usually null (score lives on the match) |
| `weight_category_id` | null |
| `medal_given_at` / `medal_given_by` | Presentation Desk handed the medal |

When `fixture.rankings_locked = true`, RPC `save_fixture_rankings` **rejects** writes.

---

## 7. Basketball scoring — how we actually store a game

Scoring page: if resolved style is `simple`, it mounts the team-versus form (points + fouls).

Staff enter:

- Side A points, Side B points
- Side A fouls, Side B fouls
- Optional football-style shootout is in the same component but basketball does not require it
- Winner (required on knockout before the match can be `completed`)

### Stored shape (example: Boys U11 Final)

Both participants get the **same** `score` string. Each gets its **own** `score_detail.score`.

```json
{
  "score": "16-21",
  "score_detail": { "fouls": 12, "score": 16, "sport": "Basketball" },
  "result_status": "loser",
  "participant_label": "1"
}
```

```json
{
  "score": "16-21",
  "score_detail": { "fouls": 5, "score": 21, "sport": "Basketball" },
  "result_status": "winner",
  "participant_label": "2"
}
```

Rules:

- `score` = `"{side1Points}-{side2Points}"` with side 1 = label `"1"`
- `score_detail.score` = **this team's** points
- `score_detail.fouls` = this team's fouls (integer ≥ 0)
- `score_detail.sport` = `"Basketball"` (display / debug; not a join key)
- Winner is **`result_status`**, not "higher points". A 0–2 forfeit is valid if staff mark winner/loser
- Bye: one participant, `result_status = bye`, `score` null

### How a save works

1. Client builds `ScoreInput[]`: `{ participant_id, score, score_detail, result_status }`
2. Service `fixturesSaveMatchScores` calls RPC **`save_fixture_match_scores(p_match_id, p_scores)`**
3. RPC is `SECURITY DEFINER`, roles **admin or scorer**
4. It updates only those participant columns. It does **not** set match status
5. The desk may then auto-advance a knockout bracket if autofill is on
6. If the match is in a **rank-deciding** round, the desk recomputes medals unless rankings are locked

Empty `score` clears the column. `score_detail: null` clears JSON.

Match status is a **separate** toggle (`draft` / `in_progress` / `completed`). Completing a 2-team knockout without a winner is blocked.

---

## 8. How medals are derived (basketball)

Function: `deriveTop3FromMatches` → `deriveTop3FromBracket`.

| Place | Source |
| --- | --- |
| Gold (rank 1) | `final` match participant with `result_status` `winner` or `bye` |
| Silver (rank 2) | `final` match participant with `result_status` `loser` |
| Bronze (rank 3) | `third_place` match winner (or repechage semi winners in combat sports) |

If there is **no** `third_place` round (small draws such as U11 Girls / U16 Girls), bronze is **not** auto-filled. Staff can type it, or leave only gold+silver.

Auto-sync runs when a score is saved on `final`, `third_place`, or `repechage_semi_final` (and the fixture is not locked). It calls `save_fixture_rankings`, which **replaces** all ranking rows for that fixture (delete + insert).

After the ceremony, staff set **`rankings_locked = true`** via `set_fixture_rankings_locked`.

---

## 9. How the rest of the product reads this

### Scoring desk (on-ground)

| Surface | Reads |
| --- | --- |
| Fixtures board | CSM `is_fixture_active`, then fixtures for that championship |
| Event editor | Create/edit rounds, courts, times, assign teams |
| Scoring | team-versus form for `simple` |
| Results / rankings modal | `fixture_ranking`; lock toggle |
| Call Room | match participants + member attendance |
| Presentation Desk | queue from completed fixtures; writes `medal_given_at` |
| Winner medals | `fixture_ranking.medal` |

### Public site / standouts

- Championship flag `competition.is_result_out` (and lifecycle) gates the results page
- Edge `championship-sports?withResultsOnly=true` lists sports that have fixture data
- RPC `get_public_championship_standout_stats` uses **locked** `fixture_ranking` only
- **Team disciplines** (`team_size > 1`, i.e. basketball):
  - School points: gold **15** / silver **10** / bronze **5** (one medal per `team_id`)
  - Athlete standouts: the same medal is **copied to every current `team_member`** at 5 / 3 / 1
- Individual sports stay 5 / 3 / 1 on the athlete row

If you rebuild results and skip `rankings_locked`, public standouts will ignore the medals.

---

## 10. End-to-end basketball lifecycle

1. **Catalog exists** — sport `BKB` + 12 disciplines. Recreate the same *shape* (codes, team sizes), not copied ids.
2. **Offer the sport** — insert CSM for Basketball, set prices/venue, `is_fixture_active = true`.
3. **Offer categories** — insert CSDM only for ages/genders this city runs.
4. **Sell registration** — coaches buy those CSDM rows; paid athletes become roster-eligible.
5. **Create teams** — one team per school per category; 5–6 (or 15) members; lock when ready.
6. **Create one fixture per offered category**
   - `format_type = bracket_elimination` (unless you truly run groups)
   - `config.scoring_style = "simple"`
   - `config.participants_per_match = 2`
   - `config.active_rounds` = the rounds you will play
   - `status = published` when the draw is public
7. **Insert rounds** with `round_type` from that list, labels, dates/times.
8. **Insert matches** with court + `scheduled_at`. Assign two `team_id`s, labels `"1"` and `"2"`.
9. **Score** each match: line + fouls + winner. Mark `completed`.
10. **Final + 3rd Place** drive auto gold/silver/bronze on `fixture_ranking` (`team_id`).
11. **Lock rankings.** Presentation Desk marks medals given.
12. **Publish results** (`is_result_out` / lifecycle). Public pages read locked ranks.

A finished basketball championship typically looks like:

- One `bracket_elimination` fixture per offered category, `published`, then `rankings_locked`
- Rounds such as QF / SF / Final / 3rd Place, matches on Court 1 / Court 2
- Scores like `23-12` with `score_detail.score` + `fouls`
- Rankings are team gold/silver/bronze (a two-round draw may have no bronze)

---

## 11. Other sports (so you do not copy basketball blindly)

Same tables. Different `format_type` + score JSON.

| Family | `format_type` | Participant | `score` / `score_detail` | Ranking source |
| --- | --- | --- | --- | --- |
| Basketball / football / kho kho | `bracket_elimination` or `league_knockout` | `team_id` | simple line + `{score, fouls?}` | Final winner/loser + 3rd |
| Badminton / TT / squash | `bracket_elimination` | athlete or team (doubles) | `sets` — set-by-set JSON | Same bracket rule |
| Athletics track | `track_rounds` | `athlete_id` | time string; heats | Positions or times on `final` |
| Field | `field_attempts` | `athlete_id` | `attempts[]` + best | Best mark |
| Chess | `swiss_system` | `athlete_id` | points + buchholz | Standings table |
| Kata / yoga | `judge_score` | `athlete_id` | judge total | Highest score |
| Judo / TKD | `bracket_elimination` **per weight class** | `athlete_id` | simple / ippon style | Same, scoped by `weight_category_id` |

**Never** store basketball points in `attempts`. **Never** put five athletes as five `fixture_match_participant` rows for one basketball match. The match has two teams; members live on `team_member`.

---

## 12. Invariants (break these and the desk / public site lie)

1. Catalog discipline identity = `sport_id + gender + age_group + name`, exposed as `code`.
2. A fixture must point at a real CSDM for that championship + discipline.
3. One basketball fixture per category per championship.
4. `team_size > 1` ⇒ every participant and ranking row uses `team_id`.
5. Two sides: `participants_per_match = 2`, labels `"1"` / `"2"`.
6. Basketball scoring style is **`simple`**. Put it on both `discipline.fixture_config` and `fixture.config`.
7. Combined `score` is identical on both rows; per-team points live in `score_detail.score`.
8. Knockout completion requires `winner` (or `bye`).
9. Medals are `fixture_ranking`, not inferred at read time from scores (except desk auto-fill *writes* them).
10. Public standouts require `rankings_locked`.
11. Soft deletes: check `deleted_at` on sport / discipline / CSM / CSDM.

---

## 13. RPCs you will need if you rebuild the desk

| RPC | Purpose |
| --- | --- |
| `save_fixture_match_scores(p_match_id, p_scores jsonb)` | Write score / score_detail / result_status / position |
| `save_fixture_rankings(p_fixture_id, p_rankings jsonb, p_weight_category_id uuid default null)` | Replace medal table; blocked when locked |
| `set_fixture_rankings_locked(p_fixture_id, p_locked boolean)` | Lock / unlock medals |
| `get_public_championship_standout_stats(competition_id, limit)` | Public leaderboard from locked ranks |

Do not update these tables with ad-hoc `.from()` from React. Services call RPCs (or tightly wrapped queries).

`p_scores` element:

```json
{
  "participant_id": "<fixture_match_participant.id>",
  "score": "16-21",
  "score_detail": { "score": 16, "fouls": 12, "sport": "Basketball" },
  "result_status": "loser"
}
```

`p_rankings` element:

```json
{
  "rank": 1,
  "team_id": "<team.id>",
  "medal": "gold"
}
```

---

## 14. Rebuild checklist (new CMS database)

If CMS needs the same behaviour:

1. Create `sport` / `discipline` (or equivalent) with a **code** and **team_size**.
2. Create championship join tables so a city can offer a subset of categories.
3. Create `team` + `team_member` before assigning match sides.
4. Create the fixture tree with the columns in §6.
5. Store basketball games as in §7.
6. Write medals as in §8 and lock them.
7. Point public results at locked ranks only.

Keep basketball as the reference implementation for **team + simple score + knockout + 3rd place**. Add sets / heats / swiss as separate scoring styles, not extra columns on the basketball participant.

---

## 15. Glossary

| Term | Meaning here |
| --- | --- |
| Sport | Catalog game (`Basketball`) |
| Discipline / category | One gender+age contest (`BKB-B-14-BKB`) |
| CSM | Sport offered at a championship |
| CSDM | Category offered at a championship |
| Fixture | The entire draw for one category |
| Round | QF / SF / Final / 3rd Place |
| Match | One game on a court |
| Participant | One side of a match (a team) |
| Ranking | Medal table for that fixture |
| Simple scoring | Points (+ fouls), not sets or times |
| Locked rankings | Official medals; public + PD trust this |
