# ADR-007: Role-based session auth (cookie JWT)

## Status

Accepted

## Context

`/admin` was reachable without authentication after demo shortcuts were removed. We need a real lock so only `ADMIN` users can open the admin app, while customers keep storefront login.

## Decision

- Store `passwordHash` on `User` (bcrypt via `bcryptjs`).
- Issue an httpOnly cookie JWT (`bitlogic_session`) signed with `AUTH_SECRET` (`jose`).
- JWT payload carries `sub` (user id), `email`, `name`, `role` (`CUSTOMER` | `ADMIN`).
- Edge `middleware` redirects non-admin visitors of `/admin/*` to `/login?next=…`.
- Login/register/logout live under `/api/auth/*`. Register always creates `CUSTOMER`.

## Consequences

- Admin and storefront share one session cookie; role decides access.
- Customer UI still mirrors profile into `localStorage` via `writeCustomer` after login (bridge until orders migrate fully).
- `AUTH_SECRET` is required in env for middleware and API routes.
