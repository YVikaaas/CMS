# Database changelog

Human-readable log of database changes for **CMS** (Supabase project `nawznuthyvhmcheevkbf`).
Append **one row per change** at the **top** of the table (newest first).

**Dates:** Use the real calendar date the change landed / was applied. Migration **filenames** use `YYYYMMDDHHMMSS` for **apply order only**.

| Date | Area | Summary | Migration / reference |
| ---- | ---- | ------- | --------------------- |
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
