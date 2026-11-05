# BitLogic — Product map (PRD-lite)

## Problem

People buy digital subscriptions / shared credentials and need fast delivery, access visibility, and support. Operators need a console to stock credentials, fulfill orders, verify payments, and handle tickets.

## Target users

1. **Buyer (storefront)** — browses products, checks out, views account credentials/orders/warranty.
2. **Operator (admin)** — manages catalog, vault stock, deliveries, payments, media, feature flags.

## Goals

- Storefront to discover and purchase digital plans.
- Account area to see credentials, orders, warranty, and support.
- Admin console to run inventory → fulfillment → payments → support.

## Non-goals (current)

- Real payment gateway production integration (UI/mock flows may exist).
- Separate `/user` app shell (buyer uses storefront `/account`).
- Multi-tenant SaaS / white-label.
- Mobile native apps.

## Core flows

1. Home → Shop → Product → Cart / Quick order → Login → Account access.
2. Admin → Products / Vault → Deliveries & chat → Payments verify → Tickets.

## Acceptance (high level)

- Buyer can open store routes without admin chrome.
- Buyer can reach `/account` after login session exists.
- Operator can open `/admin` and navigate product, vault, deliveries, payments, settings via URL.
- Store ↔ Admin switch is explicit navigation (`/` ↔ `/admin`), not a fake in-page portal mode.

## Success metric (near term)

- Happy-path demo: browse → product → account + admin fulfill path works without crashes.

## Open questions

- Production auth provider and credential encryption.
- Real bKash/Nagad settlement rules.
- Source of truth for inventory (DB) vs current in-memory/mock data.
