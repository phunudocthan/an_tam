# An Tam

Private two-person accountability app built for one couple. The product is designed around one daily loop:

1. Each person updates `Study`, `Screen time`, and `Body`.
2. Each person submits the day.
3. The app flips into a waiting state until both people are in.
4. Shared streak only grows when both personal days pass.

## Stack

- Next.js App Router
- Tailwind CSS
- Supabase Auth + Postgres + Storage
- Gemini Flash Lite for optional weekly insight

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: client-safe Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: client-safe key for auth and session handling
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for setup bootstrap, storage cleanup, and admin operations
- `GEMINI_API_KEY`: server-only key for weekly AI summaries
- `PAIR_MEMBER_EMAILS`: optional comma-separated allowlist for the two real users
- `PAIR_TIMEZONE`: pair timezone for day boundaries and streak calculation
- `GEMINI_MODEL`: lightweight Gemini model for summary generation
- `CRON_SECRET`: shared secret for protected cleanup routes

## Local setup

1. Copy `.env.example` into `.env.local` and fill in the values.
2. Apply the SQL in [supabase/migrations/20260312150000_couple_mvp.sql](/Users/maxwell/FPTu_Muon_Nam/an_tam/supabase/migrations/20260312150000_couple_mvp.sql) to your Supabase project.
3. Run `npm install`.
4. Run `npm run dev`.

## Notes

- `Study` and `Body` proof are designed to expire after the day closes.
- The cleanup endpoint is `POST /api/cron/cleanup` with header `x-cron-secret`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, or `CRON_SECRET` to the client.
