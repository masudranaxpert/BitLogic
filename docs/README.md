# BitLogic Documentation

| Document | Purpose |
|---|---|
| [prd/PRODUCT.md](prd/PRODUCT.md) | Product requirements, features, business rules, and future roadmap |
| [specs/SYSTEM.md](specs/SYSTEM.md) | System architecture, Next.js routing surfaces, caching, skeletons, and security boundaries |
| [specs/DATABASE.md](specs/DATABASE.md) | Prisma schema reference, ERD, tables, indexes, and data lifecycle |
| [specs/AUTH.md](specs/AUTH.md) | Role-based authentication, sessions, passwords, email verification, and email providers |
| [specs/SUPPLIERS.md](specs/SUPPLIERS.md) | Reseller API architecture, pricing calculations, automated dispatch engine, and edge cases |
| [adr/](adr/) | Architecture Decision Records (ADR-001 through ADR-008) |

**No `DESIGN.md`.** Visual and UI rules live in code ([`components/storefront/ui`](../components/storefront/ui), [`components/admin/ui`](../components/admin/ui)) and CSS.
