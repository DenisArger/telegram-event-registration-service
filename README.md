# telegram-event-registration-service

Monorepo scaffold for event registration via Telegram bot with web admin.

## Requirements

- Node.js 20+
- Yarn 1.22+

## Structure

- `apps/bot`: Telegram webhook service (Vercel-ready API routes)
- `apps/admin`: Next.js admin panel scaffold
- `packages/db`: Supabase data access layer
- `packages/shared`: shared contracts, env validation, logger

## Quick start

```bash
nvm install
nvm use
yarn install
cp .env.example .env
yarn dev
```

Run tests:

```bash
yarn test
```

## Troubleshooting

- If Yarn reports `Couldn't find package "@event/...@workspace:*"`, update to latest `main` and run `yarn install` again.
- If `vitest: command not found`, dependencies were not installed. Run `yarn install` first.

## Database (M1)

Core schema and transactional registration logic are in:

- `supabase/migrations/20260218132000_m1_core.sql`
- `supabase/migrations/20260218162000_m6_waitlist_promote.sql`

Apply migration using Supabase SQL editor or CLI:

```bash
supabase db push
```

The migration creates:

- tables: `users`, `events`, `registrations`, `waitlist`, `checkins`, `notifications`, `audit_logs`
- RPC functions:
  - `register_for_event(p_event_id uuid, p_user_id uuid)`
  - `cancel_registration(p_event_id uuid, p_user_id uuid)`
  - `promote_next_waitlist(p_event_id uuid)`

These RPCs are used from `packages/db/src/registrations.ts`.

## Telegram commands (M2/M3)

Participant:
- `/start`
- `/events`

Organizer/Admin:
- `/create_event Title | 2026-03-01T10:00:00Z | 30 | Optional description`
- `/publish_event <event_id>`
- `/close_event <event_id>`

## Admin API (M4)

Endpoints in `apps/bot/api/admin`:
- `GET /api/admin/events`
- `POST /api/admin/events`
- `GET /api/admin/attendees?eventId=<uuid>`
- `GET /api/admin/waitlist?eventId=<uuid>`
- `GET /api/admin/stats?eventId=<uuid>`
- `GET /api/admin/export?eventId=<uuid>`
- `POST /api/admin/publish`
- `POST /api/admin/close`
- `POST /api/admin/promote`

Auth for MVP: header `x-admin-email` must be present in `ADMIN_EMAIL_ALLOWLIST`.
Creating events from admin API also requires `ADMIN_DEFAULT_CREATOR_ID` (UUID from `users.id`), used as `events.created_by`.
Primary auth: Telegram Login + signed `HttpOnly` cookie session.
Fallback (migration only): set `ADMIN_AUTH_ALLOW_EMAIL_FALLBACK=true` to also allow `x-admin-email`.
Optional dev-only bypass: set `ADMIN_UNSAFE_LOGIN_ENABLED=true` and
`NEXT_PUBLIC_ADMIN_UNSAFE_LOGIN_ENABLED=true` to enable login by `telegram_id`
on `/login` (still requires `users.role in ('organizer','admin')`).
If admin and API are on different domains, set:
- `ADMIN_SESSION_COOKIE_SAMESITE=None`
- `ADMIN_CORS_ALLOWED_ORIGINS=https://<admin-domain>`
and keep HTTPS enabled (cookie with `SameSite=None` requires `Secure`).

Admin web (`apps/admin`) reads:
- `ADMIN_API_BASE_URL`
- `NEXT_PUBLIC_ADMIN_API_BASE_URL`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- `NEXT_PUBLIC_LOCALE`

## Deploy target

- Vercel + Supabase

## First milestones

1. Implement event CRUD and role model
2. Implement registration + waitlist transaction logic
3. Add reminders and check-in flow
