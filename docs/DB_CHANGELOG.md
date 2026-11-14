# Database changelog

Human-readable log of database changes for **CMS** (Supabase project `nawznuthyvhmcheevkbf`).
Append **one row per change** at the **top** of the table (newest first).

**Dates:** Use the real calendar date the change landed / was applied. Migration **filenames** use `YYYYMMDDHHMMSS` for **apply order only**.

| Date | Area | Summary | Migration / reference |
| ---- | ---- | ------- | --------------------- |
| 2026-11-14 | Gameplay | Seeded complete Boys U16 `4x100m` relay: 8 teams of 4, heats + SF + final times, team ranking locked. | `seed_demo_relay` |
| 2026-11-14 | Gameplay | `fixture.rankings_locked_at` locks 1st–3rd from scoring. `fixture_ranking.medal_delivered_at` marks podium medal delivery. Ranking edits are blocked while locked. | `podium_medals` |
| 2026-11-14 | Gameplay | Call room `fixture_match_attendance`: present/absent per match for a team or a player. Unique live row per match+team and match+member. Admin RLS. | `call_room_attendance` |
| 2026-11-14 | Teams | `team.city` is separate from `org_name`. City-only org values moved to city. | `team_city` |
| 2026-11-14 | Catalog | Athletics roster is solo 1/1 except relays 4/4. Live solo clubs split to one athlete per team-of-1 (member ids kept). | `athletics_solo_roster` |
| 2026-11-14 | Gameplay | Field attempt counts are per round: 3 in qualifying, 2 in the final. No extra-attempt slots. | `field_attempts_per_round` |
| 2026-11-14 | Gameplay | Manual `fixture_ranking` per draw (Results Ranking tab). Field rounds store unique `attempt_count`. Seeded complete Boys U16 basketball, 100m, Shot Put, and Long Jump with scores. | `fixture_ranking_round_attempts`, `seed_demo_floor` |
| 2026-11-14 | Gameplay | Track rounds may include quarter-finals. Basketball league configs always keep SF + final (create UI no longer strips them). | `track_qf_basketball_rounds` |
| 2026-11-14 | Catalog | Athletics relays `4x100m` and `4x400m` (Boys/Girls × U14/U16/U18). Roster 4–6. Offered to championships that already had that athletics age/gender. | `athletics_relay_events` |
| 2026-11-14 | Catalog | Athletics category identity is sport + gender + age + event name (`100m`, `Long Jump`, …). Unique live index includes `lower(name)`. Seeded track/field events for U14/U16/U18. Championships that already offered an athletics age/gender also got the sibling events. | `athletics_event_categories` |
| 2026-11-14 | Gameplay | Athletics formats `track_rounds` / `field_attempts`. Round types `heat` and `qualifying`. Heat participants: N `team_member` athletes, lane labels 1–99. `save_fixture_match_scores` also writes `position` and `attempts`. Seeded Athletics (`ATH`) + Boys/Girls U14/U16/U18. | `athletics_format_enum`, `athletics_fixtures` |
| 2026-11-13 | Gameplay | `fixture_match_score_event`: one row per basket (1/2/3) by a team member on a match. Admin RLS. Member must belong to a live match side. | `fixture_match_score_event` |
| 2026-11-03 | Gameplay | RPC `save_fixture_match_scores(p_match_id, p_scores jsonb)`. Admin-only. Writes participant score / score_detail / result_status. Does not set match status. | `save_fixture_match_scores` |
| 2026-11-03 | Gameplay | Fixture tree: one live draw per CSC. Formats `league_knockout` and `bracket_elimination`. Rounds, matches, two team sides. Admin RLS. | `gameplay_fixtures` |
| 2026-11-03 | Teams | Seeded 4 mock Boys U16 teams with members in BB Championship December. | `seed_mock_teams_u16_boys` |
| 2026-11-03 | Teams | `team_member.gender` is always copied from the team (category) gender. | `team_member_gender_from_category` |
| 2026-11-03 | Teams | Team belongs to one CSC (`competition_sport_category_map_id`). Dropped `team.sport_id` and `team_csc_map`. Unique live name per CSC. Gender synced from category. | `team_belongs_to_csc` |
| 2026-11-03 | Teams | CHECK on `team.name` and optional `org_name`: letters and spaces only. | `team_name_alpha` |
| 2026-11-03 | Teams | `team.gender`; `team_member` (name, phone, gender). Live unique `(lower(name), phone)`. Unique team name per sport+gender. | `team_gender_members` |
| 2026-11-03 | Catalog | Restored `category` without a `code` column. Identity is sport + gender + age group. Teams map via `team_csc_map`. | `restore_category_without_code` |
| 2026-11-03 | Auth | Local-dev password set on admin Auth user so sign-in works while built-in magic-link email is rate-limited. | Auth `encrypted_password` update for `vikaas4644@gmail.com` |
| 2026-11-03 | Auth | Magic-link OTP wait reduced: `smtp_max_frequency` 60s → 5s, `rate_limit_otp` 30 → 60. Built-in email send cap stays 2/hour (custom SMTP required to raise it). | Management API `PATCH /v1/projects/nawznuthyvhmcheevkbf/config/auth` |
| 2026-11-03 | Identity / catalog / teams | `public.users` keyed to Auth, `user_roles`, sport/category masters, championships (CSM + CSC), sport-specific teams + `team_csc_map`. RLS admin-only on catalog. Basketball + 12 categories seeded. Admin role only for `vikaas4644@gmail.com` on first Auth insert. | `slice1_identity`, `slice1_catalog_championships_teams` |
| 2026-11-03 | Auth | Site URL set to `http://localhost:3002`. Redirect allowlist: `http://localhost:3002/auth/callback` and `http://localhost:3002/**`. No schema change. | Management API `PATCH /v1/projects/nawznuthyvhmcheevkbf/config/auth` |
| 2026-11-03 | Setup | Project linked. No schema applied. Empty `public` schema. | — |
