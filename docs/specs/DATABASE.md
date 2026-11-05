# Database notes

## Now (SQLite)

```env
DATABASE_URL="file:./dev.db"
```

```bash
bunx prisma migrate dev --name init
bunx prisma generate
bun run db:seed
```

Seed copies the demo catalog from `lib/products.ts` into SQLite (9 products + plans).

## Later (PostgreSQL)

1. In `prisma/schema.prisma`, set `provider = "postgresql"`.
2. Set env, e.g. `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/bitlogic?schema=public"`.
3. Archive or remove SQLite migration folder if starting clean; run `bunx prisma migrate dev --name init_postgres` against empty Postgres.
4. Re-seed data. Application code using `lib/db` should not need provider-specific changes if the schema stayed portable.

## Rules

- Money: `Decimal` fields (`priceBdt`, `totalBdt`, …).
- IDs: `cuid()` strings.
- Enums: use `String` + app-level constants until you standardize (easier across SQLite→Postgres early on).
