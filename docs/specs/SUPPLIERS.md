# Suppliers (reseller APIs)

BitLogic can sell plans it does not stock itself by buying them from a supplier's reseller API
at the moment a customer's payment is verified. Pandora Digital and Jaha Digital are the first two;
any other API is added by writing one adapter file.

## Model

```
Supplier ──< SupplierProduct ──< PlanSupplierLink >── ProductPlan (our option)
   │                                                     │
   └──< SupplierOrder >── DigitalDelivery (one customer unit)
PriceHistory (every price change of a plan, who/what changed it)
CurrencyRate (USD → BDT, USDT → BDT)
```

- **Supplier**: one API connection. Key stored encrypted (AES-GCM), never sent to the browser.
  Has two switches: *enabled* (sync + use) and *purchasing* (kill switch for buying only).
- **SupplierProduct**: cached copy of one catalog item (price, stock, status, limits, delivery type,
  whether it needs buyer input). Refreshed by sync. Items that disappear from the catalog are kept
  as `removed`, never deleted, so links and history survive.
- **PlanSupplierLink**: which supplier item(s) can fulfil one of our options, in priority order.
  More than one link = automatic fallback to the next supplier.
- **SupplierOrder**: one purchase attempt for exactly one customer unit. Its id is the
  Idempotency-Key sent to the supplier, so a retried request can never buy twice.

## Option (plan) settings

| Setting | Values | Meaning |
|---|---|---|
| Sourcing | `own` · `own_then_supplier` · `supplier_auto` · `supplier_manual` | Where credentials come from. `own` = stock/manual as before. |
| Pricing | `fixed` · `auto` | `auto` = supplier cost × rate × (1 + markup %) + flat fee, rounded up. |
| Renewal price | `current` · `locked` | `locked` = renew at the price first paid (or today's, if lower). |
| Sell when out of stock | inherit · yes · no | Per option now; falls back to the product's setting. |

## Lifecycle of a supplier-fulfilled unit

1. Checkout: the option is orderable only if own stock or a usable supplier item has stock
   (or the option allows back-orders), and the price still covers the cost.
2. Admin verifies the payment → the order is queued for dispatch (from the browser right away,
   and from the server as a backup).
3. Dispatcher claims each pending unit atomically (`pending_dispatch` → `supplier_processing`),
   re-checks price/stock/balance, then buys one unit with a stable idempotency key.
4. `delivered` → credential saved encrypted as a delivered Vault row, linked to the unit,
   warranty clock starts, audit entry `supplier`. `processing`/`manual_review` → polled.
   `failed` → next linked supplier, else back to pending with an admin alert.
5. Pandora can push signed webhooks; polling always runs as the safety net.

## Edge cases and how they are handled

### Catalog and sync
1. **Supplier removes an item** → marked `removed`; linked options lose that source; admin alert.
2. **Item comes back** → status restored automatically on the next sync.
3. **Same item id reused for a different product** → name change is logged; link stays but shows "name changed".
4. **Pagination** (Jaha 100/page, Pandora cursor) → follow `next_cursor` until null, with a page cap.
5. **Sync fails mid-way** → nothing is marked removed (only a complete sync can remove items).
6. **Rate limit (429)** → honour `Retry-After`, stop this run, keep old cache.
7. **Invalid/revoked key (401)** → connection marked `error`, purchasing paused, never retried in a loop.
8. **Stock `null` (unknown)** → treated as available but never shown as a number.
9. **Status `out_of_stock` with stock > 0** (or the reverse) → status wins.
10. **Two syncs at once** (button + scheduler) → in-process lock per supplier.
11. **Supplier API slow/down** → 15 s timeout; storefront always reads the cache, never the live API.

### Pricing and money
12. **Supplier raises cost, option uses auto pricing** → our price follows on the next sync (logged).
13. **Cost jumps more than the guard (default 30 %)** → not applied automatically; option flagged for review.
14. **Cost now above a fixed price** → "loss" flag; the option stops selling (configurable) until fixed.
15. **Cost drops** → auto price drops too (rounded); fixed price unchanged but margin shown.
16. **Exchange rate changed** → all auto prices recalculated once, logged as `rate` changes.
17. **Rounding** → always up to the chosen step (e.g. ৳10), never below cost + minimum margin.
18. **Price changed between checkout and dispatch** → re-quote; buy only if still within the
    tolerated loss, otherwise the unit waits for the admin ("Buy anyway" or refund).
19. **Pandora `PRICE_CHANGED`** → re-quote once, re-check margin, retry with a **new** key (new body).
20. **Jaha `price_changed`** → same, using `max_unit_price_usdt` as the ceiling.
21. **Decimal strings** ("0.285", "12.5000") → parsed exactly, never through float string math for display.
22. **Currency not configured** (e.g. a new supplier in EUR) → auto price refuses to compute; admin warned.
23. **Admin saves the product with an old price while auto pricing changed it** → server keeps the auto price.
24. **Coupons/discounts push the sale below cost** → order still accepted (business decision) but flagged in the supplier order log.
25. **Every price change** (admin, auto, rate) → `PriceHistory` row with old/new, source and who.

### Stock and availability
26. **One option out of stock, others not** → only that option shows "Out of stock"; product stays buyable.
27. **All options out of stock** → product shows out of stock as before.
28. **Option allows back-orders** → buyable while out of stock; unit waits as pending.
29. **Own stock first, then supplier** → vault credential used when present; supplier only for the rest.
30. **Quantity above supplier max / below min** → checkout refuses with the limit.
31. **Stock 3, customer buys 5** → refused unless back-orders are on.
32. **Two customers buy the last unit** → second dispatch gets `OUT_OF_STOCK` → fallback supplier → else pending + alert.
33. **Linked item needs buyer input** (Jaha email/password) → cannot auto-buy; link shows a warning and dispatch leaves the unit for the admin.
34. **Manual-delivery item** (Jaha `manual`) → order stays `manual_review`; polled until delivered.

### Purchasing
35. **Network timeout after sending the order** → retried with the **same** idempotency key; no double buy.
36. **Server restarts mid-purchase** → claim row survives; recovery job re-sends with the same key.
37. **Insufficient balance** → unit stays pending, supplier marked low-balance, admin alert; "Retry" after top-up.
38. **Purchasing paused by the supplier** (`PURCHASING_DISABLED` / `purchases_disabled`) → stop buying from it, fall back.
39. **Daily/monthly limit hit** → same as above, retried after the window.
40. **Kill switch off in BitLogic** → nothing is bought; units wait for the admin.
41. **Payment verified twice / dispatch triggered twice** → atomic claim; the second call finds nothing to do.
42. **Admin assigns a credential by hand while a purchase is in flight** → in-flight unit is locked; manual edit waits.
43. **Stale admin screen saves an old copy of the order** → server never reverts a supplier-delivered or in-flight unit.
44. **Order refunded before dispatch** → refunded/revoked units are never bought.
45. **Order refunded after supplier delivered** → supplier purchase is not auto-refunded (supplier rules); log shows it needs a manual claim.
46. **Partially completed** (Jaha) → unit counted delivered only when its data arrives.
47. **Supplier sends extra data later** (Jaha additions) → credential updated, audit `replaced`, admin notified.
48. **Delivered but empty data** → treated as not delivered; alert.
49. **Credential text format** ("email:password", multi-line) → stored as-is, encrypted; never logged.
50. **Supplier marks order refunded/failed after delivery** → unit flagged, admin alert, credential kept for evidence.

### Webhooks and security
51. **Forged webhook** → HMAC-SHA256 over `timestamp.body`, constant-time compare, 5-minute window.
52. **Replayed webhook** → event id stored; duplicates ignored.
53. **Webhook carries no credentials** (by design) → always re-read the order through the API.
54. **Local/dev URL** → webhook setup refused (needs public HTTPS); polling covers it.
55. **API key in logs/browser** → masked hint only (`…3pAw`); errors are scrubbed before saving.
56. **Staff without permission** → Suppliers menu needs the `suppliers` permission (admins always).

### Renewals
57. **Renewal of a supplier option** → paid renewal queues a new supplier purchase for those units (new credential).
58. **Price rose since purchase** → `current` charges today's price; `locked` keeps the old one.
59. **Price dropped** → `locked` customers pay the lower of the two.
60. **Original price unknown** (old/seeded orders) → falls back to today's price.

### Operations
61. **Supplier deleted** → only allowed with no in-flight orders; links removed, history kept.
62. **Option deleted** → its links go with it; supplier orders keep their snapshot.
63. **Many suppliers later** → each adapter implements the same 6 calls; nothing else changes.

## Admin pages

Suppliers menu: **Connections** (add, key, balance, sync, switches, webhook) · **Catalog** (all supplier items,
cost in taka, link) · **Linked options** (every option: source, cost, price, profit, stock, alerts; opens the
option editor) · **Purchases** (log with cost/profit, check now, show delivery) · **Pricing & rules** (rates,
auto-buy switch, loss stop, price-jump guard, accepted loss at purchase). The product edit page shows
**Sourcing & pricing** and **Price history**; the order page shows each unit's supplier state with
Buy / Retry / Buy anyway.

## Adding another supplier

1. Write `lib/suppliers/<name>.ts` implementing `SupplierAdapter` (account, catalog, item, buildOrder,
   submitOrder, getOrder, optional setWebhook) and map its error codes to ours.
2. Add it to `lib/suppliers/registry.ts`. It appears in "Add supplier" automatically.

## Tests (2026-11-07)

- Real Pandora and Jaha accounts: key check, balance, full catalog sync (77 and 423 items, Jaha paginated), wrong key refused, key never returned by the API. Buying left **off** on both.
- Mock servers speaking each supplier's protocol: 78/78 end-to-end checks, including payment-not-verified block,
  instant and delayed delivery, timeout with identical re-send (one order at the supplier), fallback to the second
  supplier, price above sale → review → buy anyway, no balance, auto price + guard + approve, loss stop, rate
  change, removed/restored items, manual delivery + supplementary data, background sweep, locked renewal price,
  stale admin save protection, permissions. UI: 14/14 checks.
