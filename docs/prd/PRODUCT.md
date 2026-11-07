# BitLogic — Product

## Problem

People in Bangladesh buy digital subscriptions (AI tools, streaming, software seats) and pay by bKash/Nagad.
They need fast delivery, a clear view of what they own and when it ends, renewals, warranty and support.
The operator needs one console to stock credentials, take orders, check payments, deliver, renew and support.

## Users

1. **Buyer** — storefront and `/account`. Can check out as a guest (private order link) or with an account.
2. **Admin** — full console access.
3. **Staff** — console access limited to the menus an admin grants.

## What exists

### Storefront
- Catalog, product page, cart and quick order. Out-of-stock and suspended products are shown as such and can't be bought
  (unless the product allows back-orders).
- Checkout with bKash/Nagad + TrxID. Orders can be paused or the store put in maintenance from Settings.
- Account: orders with per-item days left and warranty, credentials, renewals (per item, choose how many seats),
  warranty claims, support tickets, profile, password change.
- Sign-up with email confirmation, forgot/reset password by email (when email is set up).

### Admin console
- Dashboard with real numbers; Ctrl/⌘+K search across orders, customers, products.
- Products: plans, prices, availability (active / out of stock / suspended / draft), renewable or one-time,
  and an optional **order window** (opens / closes at a date and time) for limited-time offers or launches.
  The product page shows a live countdown; outside the window it is listed but cannot be ordered.
- Vault: credential stock, encrypted.
- Orders: order page with all items, send credentials per unit (multi-quantity), deliver without a credential,
  notes (editable for 24 h, then locked), refunds (full or partial), chat (hidden until opened).
- Add order by hand: several lines, any price, unpaid / partial / paid, optional gateway and TrxID.
- Payments: verify, reject, refund; coupons on their own page.
- Customers: CRM details, tier, suspend (blocks login), sign-in help (email reset link or set a new password).
- Tickets, notifications, media, staff accounts with per-menu permissions.
- Settings: maintenance, pause orders, announcement bar, renew window, email provider.
- Storefront: site title and description, and the homepage banners (5 main slides + 2 side banners, each with
  size guidance and a click target: nothing, a product, a category or a link).

## Rules that matter

- **Access period** runs from the order; renewals extend it per unit.
- **Order window**: a product with a closing time cannot be ordered after it (server-enforced; admin manual orders
  are exempt). Existing customers can still renew. Before the opening time it shows "Opens in …".
- **Renew window**: opens 7 days before an item ends, stays open 3 days after (both set in Settings).
  After that a new order is needed. One-time products never renew.
- **Warranty** starts when the unit is delivered (admin can move the start), lasts the plan's warranty days,
  never runs past the access end, and never stacks: an early renewal queues the next period's warranty.
- **Passwords** are never visible to anyone. Admins can only send a reset link or set a new password.
- Nothing in the product is simulated: every button acts on real data.

## Not in scope (now)

- Automatic bKash/Nagad payment confirmation (payments are verified by hand).
- Native mobile apps, multi-tenant/white-label.

## Open questions

- Automatic expiry reminder emails (email sending is now in place).
- Moving rate limits to shared storage when scaling past one server.
