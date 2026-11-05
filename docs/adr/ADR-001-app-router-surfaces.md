# ADR-001: App Router with separate store and admin surfaces

## Status

Accepted

## Context

The app originally behaved like a single client page switching “portal modes,” which blocked real URLs, SEO, and clean code-splitting.

## Decision

Use Next.js App Router with:

- Storefront under `app/(store)/` (route group; URLs without `/store`)
- Admin under `app/admin/`
- Thin `page.tsx` files that compose components

## Alternatives considered

- Keep one SPA `page.tsx` with view enums — rejected (no real routing)
- Put admin under query `?mode=admin` — rejected (weak URLs, harder sharing)

## Consequences

- Clear URLs for shop, product, account, admin sections
- Separate layouts/providers per surface
- Navigation must use the router, not only React state
