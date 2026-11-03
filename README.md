# CMS

Next.js shell for content management. Supabase project `nawznuthyvhmcheevkbf`.

## Setup

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
```

Open [http://localhost:3002](http://localhost:3002). Sign-in uses **Supabase email magic link**. Add the local callback to **Supabase Auth → URL configuration**:

- Site URL: `http://localhost:3002`
- Redirect: `http://localhost:3002/auth/callback`

## Routes (base)

| Path | Purpose |
|------|---------|
| `/login` | Email magic-link sign-in |
| `/auth/callback` | Magic-link / PKCE callback |
| `/dashboard` | Signed-in placeholder |

## Database

Migrations live in `supabase/migrations/`. Changelog: `docs/DB_CHANGELOG.md`. This project starts with an empty `public` schema.

Sport → discipline → fixture → score → medals (basketball walkthrough): [`docs/SPORT_DISCIPLINE_FIXTURE_SCORING.md`](docs/SPORT_DISCIPLINE_FIXTURE_SCORING.md).
