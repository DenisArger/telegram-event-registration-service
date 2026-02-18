# telegram-event-registration-service

Monorepo scaffold for event registration via Telegram bot with web admin.

## Structure

- `apps/bot`: Telegram webhook service (Vercel-ready API routes)
- `apps/admin`: Next.js admin panel scaffold
- `packages/db`: Supabase data access layer
- `packages/shared`: shared contracts, env validation, logger

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Deploy target

- Vercel + Supabase

## First milestones

1. Implement event CRUD and role model
2. Implement registration + waitlist transaction logic
3. Add reminders and check-in flow
