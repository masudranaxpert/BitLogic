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
| `/login` | Sign in / register (`?mode=register`), forgot password |
| `/reset-password` | New password from an emailed link (`?token=`) |
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
- Auth: httpOnly cookie session checked against the DB on every request (see [AUTH.md](AUTH.md)).
  The storefront also keeps name/email/phone in `localStorage` for display and guest order links; it is refreshed from `/api/account/profile`.
- Admin domain data: Prisma-backed workspace (`lib/admin/workspace-repo` + `/api/admin/workspace`).
- Database: Prisma + SQLite (`DATABASE_URL=file:./dev.db`). Client: `lib/db.ts`.
- Catalog: `lib/catalog/*` queries + map; store layout loads products into `CatalogContext`.
- Store settings: `StoreSetting` via Admin → Settings (`/api/admin/settings`, `/api/admin/email`).
- Orders: one shared `lib/orders/create-order.ts` for storefront and admin; warranty/renew math in `lib/warranty.ts`.
- Email: `lib/email/*` (SMTP or Resend/Brevo/SendGrid/Postmark/Mailgun).

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

- `npx tsc --noEmit`
- Manual: store routes + `/admin` navigation + storefront↔admin links
