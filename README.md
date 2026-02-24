# telegram-event-registration-service

Monorepo for Telegram event registration SaaS: bot runtime, admin panel, shared DB/data layer, and Supabase SQL migrations.

## Requirements

- Node.js 20+
- Yarn 1.22+
- Docker (optional, for local compose)

## Architecture

- `apps/bot`: Vercel-style API routes for Telegram webhook and admin API
- `apps/admin`: Next.js admin UI
- `packages/db`: Supabase data-access layer
- `packages/shared`: contracts, env validation, logger
- `supabase/migrations`: schema, constraints, and transactional SQL/RPC

Multi-tenant model:
- `organizations`
- `organization_members`
- `events.organization_id` (tenant boundary)

## Quick start

```bash
nvm install
nvm use
yarn install
cp .env.example .env
yarn dev
```

Run quality gates:

```bash
yarn lint
yarn typecheck
yarn test
```

## Database

Apply SQL migrations with Supabase CLI:

```bash
supabase db push
```

Core migrations include:
- `20260218132000_m1_core.sql`
- `20260218162000_m6_waitlist_promote.sql`
- `20260224170000_m15_multi_tenant_organizations.sql`

## API

Health/readiness:
- `GET /api/health` (liveness)
- `GET /api/ready` (Supabase connectivity)

Admin API (selected):
- `GET /api/admin/organizations`
- `POST /api/admin/organizations`
- `GET /api/admin/events?organizationId=<uuid>`
- `POST /api/admin/events`
- `PUT /api/admin/events`
- `GET /api/admin/attendees?organizationId=<uuid>&eventId=<uuid>`
- `GET /api/admin/waitlist?organizationId=<uuid>&eventId=<uuid>`
- `GET /api/admin/stats?organizationId=<uuid>&eventId=<uuid>`
- `GET /api/admin/export?organizationId=<uuid>&eventId=<uuid>`
- `POST /api/admin/publish`
- `POST /api/admin/close`
- `POST /api/admin/promote`
- `POST /api/admin/checkin`
- `POST /api/admin/ai-draft`

## Auth and Tenant isolation

- Primary auth: Telegram Login + signed `HttpOnly` cookie session.
- Email header fallback controlled by `ADMIN_AUTH_ALLOW_EMAIL_FALLBACK` (disable in production).
- Tenant hard boundary controlled by `ADMIN_REQUIRE_ORG_CONTEXT=true` (recommended).
- Secret data in logs is redacted by shared logger.

## Environment variables

See `.env.example` for full list. Important variables:
- `ADMIN_AUTH_ALLOW_EMAIL_FALLBACK`
- `ADMIN_REQUIRE_ORG_CONTEXT`
- `TOKEN_ENCRYPTION_KEY`
- `ADMIN_SESSION_SECRET`

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Services:
- bot: `http://localhost:3000`
- admin: `http://localhost:3001`
- postgres: `localhost:5432`

## Notes

- `organizationId` is required for admin event-scoped endpoints when `ADMIN_REQUIRE_ORG_CONTEXT=true`.
- CSV export and lifecycle operations are validated inside organization scope.
