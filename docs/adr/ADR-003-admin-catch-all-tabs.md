# ADR-003: Admin tabs via catch-all slug

## Status

Accepted

## Context

Admin has many tabs (products, vault, deliveries, …) with shared in-memory state in one dashboard shell.

## Decision

Use `app/admin/[[...slug]]/page.tsx` rendering `AdminDashboard`, with tab ↔ path mapping in `lib/admin-routes.ts`.

## Alternatives considered

- One Next page per admin tab with shared context provider — better long-term split; deferred to avoid a large rewrite while state lives in the shell
- Query-only `?tab=` — weaker path semantics

## Consequences

- Admin URLs are shareable
- Shell still holds domain state; further split can move state into a provider later
