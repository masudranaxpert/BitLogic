# BitLogic — System map (tech spec)

## Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind v4
- Package manager: Bun (`bun.lock`)
- ORM: **Prisma** — SQLite now, PostgreSQL-ready schema (see ADR-006)
- Dev: `bun run dev` → http://localhost:3000

## Surfaces

| Surface | Base URL | Code |
|---------|----------|------|
| Storefront | `/` | `app/(store)/` + `components/storefront/` |
| Admin | `/admin` | `app/admin/` + `components/admin/` |

Buyer account is part of storefront: `/account` (not a third portal).

## Routes (store)

| Path | Role |
|------|------|
| `/` | Home |
| `/shop` | Catalog (`?code=`, `?q=`) |
| `/product/[id]` | Product detail |
| `/cart` | Cart |
| `/how`, `/faq`, `/contact` | Content |
| `/login` | Auth UI (`?mode=register`) |
| `/account` | Buyer portal (`?tab=`) |

## Routes (admin)

Catch-all `app/admin/[[...slug]]` maps tabs via `lib/admin-routes.ts`  
Examples: `/admin`, `/admin/products`, `/admin/vault`, `/admin/deliveries`, `/admin/payments`, `/admin/settings`.

## Folder layout

```
app/
  (store)/          # store routes + StoreProviders layout
  admin/            # admin routes + metadata layout
components/
  admin/{shell,views,ui}
  storefront/{chrome,pages,features,ui}
context/            # Cart, QuickOrder, StoreNav
hooks/              # React hooks (e.g. useCustomerSession)
lib/                # helpers/routes + `db.ts` (Prisma client)
prisma/             # schema + migrations
docs/               # this documentation
```

## State & data (current)

- Store nav: URL-driven (`context/StoreNavContext` + `lib/store-routes.ts`).
- Cart / quick order: React context.
- Customer session: still `localStorage` (migrate to DB auth later).
- Admin domain data: still largely in-memory seed (`lib/admin-data`) — **persist slice-by-slice via Prisma**.
- Database: Prisma + SQLite (`DATABASE_URL=file:./dev.db`). Client: `lib/db.ts`.
- Catalog: `lib/catalog/*` queries + map; store layout loads products into `CatalogContext`. Seed: `bun run db:seed`.

### Postgres cutover (later)

1. Change `prisma/schema.prisma` `provider` to `postgresql`.
2. Set `DATABASE_URL` to a Postgres URL.
3. Create a **new** migration history for Postgres (do not replay SQLite SQL as-is).
4. Seed / migrate data; app Prisma queries stay the same if the schema stayed portable.

## Boundaries

- `app/**/page.tsx` stays thin; UI lives under `components/`.
- Store design system: `components/storefront/ui`.
- Admin primitives: `components/admin/ui`.
- Do not reintroduce a mega single-page SPA for both surfaces.

## Test / verify

- `bunx tsc --noEmit`
- Manual: store routes + `/admin` navigation + storefront↔admin links
