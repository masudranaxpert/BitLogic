# ADR-006: Prisma with SQLite now, PostgreSQL later

## Status

Accepted

## Context

We need a real database under the UI. Local/dev should stay simple. Production should be able to move to PostgreSQL without rewriting the domain model.

## Decision

- Use **Prisma** as the ORM.
- **Dev/now:** `provider = "sqlite"` + `DATABASE_URL="file:./dev.db"`.
- Design the schema with **PostgreSQL-compatible** field types only (avoid SQLite-only habits).
- Keep `DATABASE_URL` in env; when moving to Postgres, change `provider` to `postgresql`, point URL at Postgres, create a **new** migrate history for Postgres (do not expect SQLite migration files to apply unchanged).
- Access DB only through `lib/db.ts` (singleton PrismaClient).

## Alternatives considered

- Raw SQL / Drizzle — fine tools; Prisma chosen for schema + migrate DX with this team
- Start directly on Postgres locally — heavier for early UI hardening
- Dual providers via magic env switch — Prisma still needs an explicit `provider` change; document the cutover instead of pretending zero-touch

## Consequences

- Fast local setup
- Cutover to Postgres is a planned step: new `provider`, new `DATABASE_URL`, fresh migrations + seed/data move
- App code using Prisma Client stays the same across providers if the schema stays portable
