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

Apply migration using Supabase SQL editor or CLI:

```bash
supabase db push
```

The migration creates:

- tables: `users`, `events`, `registrations`, `waitlist`, `checkins`, `notifications`, `audit_logs`
- RPC functions:
  - `register_for_event(p_event_id uuid, p_user_id uuid)`
  - `cancel_registration(p_event_id uuid, p_user_id uuid)`

These RPCs are used from `packages/db/src/registrations.ts`.

## Deploy target

- Vercel + Supabase

## First milestones

1. Implement event CRUD and role model
2. Implement registration + waitlist transaction logic
3. Add reminders and check-in flow
