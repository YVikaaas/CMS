# Database changelog

Human-readable log of database changes for **CMS** (Supabase project `nawznuthyvhmcheevkbf`).
Append **one row per change** at the **top** of the table (newest first).

**Dates:** Use the real calendar date the change landed / was applied. Migration **filenames** use `YYYYMMDDHHMMSS` for **apply order only**.

| Date | Area | Summary | Migration / reference |
| ---- | ---- | ------- | --------------------- |
| 2026-11-03 | Auth | Site URL set to `http://localhost:3002`. Redirect allowlist: `http://localhost:3002/auth/callback` and `http://localhost:3002/**`. No schema change. | Management API `PATCH /v1/projects/nawznuthyvhmcheevkbf/config/auth` |
| 2026-11-03 | Setup | Project linked. No schema applied. Empty `public` schema. | — |
