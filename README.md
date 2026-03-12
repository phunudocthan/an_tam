# An Tam

Private two-person accountability app built for one couple. The product is designed around one daily loop:

1. Each person updates `Study`, `Screen time`, and `Body`.
2. Each person submits the day.
3. The app flips into a waiting state until both people are in.
4. Shared streak only grows when both personal days pass.

## Stack

- Next.js App Router
- Tailwind CSS
- Password-only app auth + Supabase Postgres + Storage
- Gemini Flash Lite for optional weekly insight

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: client-safe Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: optional if you still want the browser SDK around, but login no longer depends on it
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for database and storage operations
- `GEMINI_API_KEY`: server-only key for weekly AI summaries
- `PAIR_MEMBER_ONE_PASSWORD`: fixed password for member 1
- `PAIR_MEMBER_TWO_PASSWORD`: fixed password for member 2
- `APP_SESSION_SECRET`: server-only secret for signing the app session cookie
- `PAIR_TIMEZONE`: pair timezone for day boundaries and streak calculation
- `GEMINI_MODEL`: lightweight Gemini model for summary generation
- `CRON_SECRET`: shared secret for protected cleanup routes

## Local setup

1. Copy `.env.example` into `.env.local` and fill in the values.
2. Apply all SQL migrations in [`supabase/migrations`](/Users/maxwell/FPTu_Muon_Nam/an_tam/supabase/migrations), including the password-only auth remap migration.
3. Run `npm install`.
4. Run `npm run dev`.

## Notes

- Login no longer depends on Supabase Auth. The two fixed passwords are defined entirely via env vars.
- `Study` and `Body` proof are designed to expire after the day closes.
- The cleanup endpoint is `POST /api/cron/cleanup` with header `x-cron-secret`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `APP_SESSION_SECRET`, or `CRON_SECRET` to the client.
