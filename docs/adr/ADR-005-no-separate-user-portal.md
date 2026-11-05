# ADR-005: No separate user portal surface

## Status

Accepted

## Context

An older demo had a third “user portal” shell alongside store and admin.

## Decision

Buyer experience lives in the storefront (`/account`, `/login`). Do not maintain a separate `/user` app tree.

## Alternatives considered

- Dedicated `/app` or `/user` dashboard — only if product later wants a logged-in shell distinct from marketing store
- Keep legacy `UserPortalView` — removed as dead duplication

## Consequences

- Two surfaces only: store + admin
- Account features extend `components/storefront/pages` + store UI kit
