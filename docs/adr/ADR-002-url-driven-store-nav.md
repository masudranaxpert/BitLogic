# ADR-002: URL-driven storefront navigation

## Status

Accepted

## Context

Store views (home, shop, product, cart, account) were switched via client `view` state, so refresh/share broke deep links.

## Decision

Derive storefront view from the pathname and search params (`lib/store-routes.ts` + `StoreNavContext`). `navigateTo` calls `router.push`.

## Alternatives considered

- Keep client-only view state — rejected for UX and debugging
- Full page components without shared shell — deferred; shell still composes views

## Consequences

- Deep links work (`/product/[id]`, `/shop?code=AI`)
- Providers wrap store layout; shell remounts per route page (acceptable for now)
