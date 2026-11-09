# BitLogic — Product

## Problem

People in Bangladesh buy digital subscriptions (AI tools, streaming, software seats) and pay by bKash/Nagad.
They need fast delivery, a clear view of what they own and when it ends, renewals, warranty and support.
The operator needs one unified console to stock credentials, connect reseller supplier APIs, take orders, check payments, dispatch credentials automatically or manually, renew, and support customers.

## Users

1. **Buyer** — storefront and `/account`. Can check out as a guest (private unguessable order link) or with an authenticated account.
2. **Admin** — full console access across catalog, inventory, suppliers, orders, payments, customers, and system settings.
3. **Staff** — console access limited strictly to the menus an admin grants via role-based permissions.

## What exists

### Storefront
- Catalog, product page, cart, and quick order with real-time stock and scheduling status. Out-of-stock and suspended products are visibly tagged and cannot be bought unless the option permits backorders.
- Checkout with bKash/Nagad/Rocket/Upay/Bank + Transaction ID (TrxID). Orders can be paused or the entire store put into maintenance from Admin Settings.
- Account portal (`/account`): orders with per-unit days remaining, warranty status, credentials, renewals (per item, choose how many seats), warranty claims, support tickets, profile, and password management.
- User authentication with email confirmation, password reset links via email (when email provider is configured), and guest order access tokens.

### Admin console
- Dashboard with live revenue, order, and inventory metrics; global Ctrl/⌘+K command palette searching across orders, customers, and products.
- Products: plans, prices, availability (active / out of stock / suspended / draft), renewable or one-time, and an optional **order window** (opens / closes at an exact date and time) for limited-time offers or flash sales with live storefront countdowns.
- Vault: credential stock with AES-256-GCM encryption at rest.
- Orders: multi-line orders, unit-level credential assignment (for multi-quantity orders), delivery without credential option, internal notes (editable for 24 h, then locked into an immutable audit trail), refunds (full or partial), and real-time customer support chat.
- Add order by hand: multi-line support, arbitrary price overrides, unpaid / partial / paid status, and manual gateway/TrxID entry.
- Payments: verify, reject, refund; coupons with usage caps and minimum spend requirements.
- Customers: CRM details, customer tiers (subscriber, reseller, vip), account suspension (instantly revokes login and API sessions), and credential reset tools.
- Suppliers & Reseller APIs: connect Pandora Digital, Jaha Digital, or mock adapters. Browse supplier catalogs with live BDT conversion, map supplier variants to store options, configure auto or fixed pricing with jump/loss guards, and automate order dispatch upon payment verification.
- Staff Management: dedicated staff logins with granular menu permissions and audit logging (`ActivityLog`).
- Settings: maintenance switch, pause orders toggle with custom customer message, announcement banner, renewal window configuration, and email service configuration.

---

## Core Systems & Engine Rules

### Supplier Sourcing & Dispatch Engine
Products and individual plans define how fulfillment is sourced:
1. **Sourcing Modes (`ProductPlan.sourcing`)**:
   - `own`: fulfilled strictly from BitLogic's internal encrypted Vault inventory.
   - `own_then_supplier`: hybrid mode — uses internal Vault stock first; if depleted, automatically sources remaining units from the linked supplier.
   - `supplier_auto`: automatically buys from the linked reseller API as soon as the order payment is verified.
   - `supplier_manual`: queues units as `pending_dispatch` for explicit admin review and one-click manual dispatch from the order console.
2. **Automated Dispatch Execution**:
   - Triggered on payment verification (`verify`), automated background queue processing (`sweep`), or customer renewal (`renewal`).
   - Uses **single-flight concurrency locking** (`singleFlight`) per order/unit to prevent duplicate dispatch under rapid clicks or concurrent webhooks.
   - Generates a cryptographically secure, stable **Idempotency-Key** (`SupplierOrder.id` format `so_<timestamp><random>`) sent with every external supplier request. Retries reuse the exact same key.
   - Atomic unit claiming: a delivery unit transitions `supplierState` to `processing` inside a database transaction before network calls start, ensuring sibling workers never double-purchase.
   - **Financial Safeguards**:
     - Pre-dispatch payment check: never spends supplier funds before payment is marked `verified`.
     - Price jump guard: if supplier price increased by more than the configured threshold (default 30%), the purchase halts and alerts admins.
     - Minimum margin enforcement: automatically stops sales if supplier cost exceeds retail price minus minimum margin (`minMarginBdt`).
     - Balance monitoring: alerts admins when supplier account balance drops below the safety threshold.
     - Kill switches: global storefront switch (`supplierAutoDispatch`) and per-supplier toggle (`purchasingEnabled`).

### Password Security Policy (Ponytail Zero-Dependency)
BitLogic enforces a smart, zero-dependency password security policy implemented in [`lib/auth/password-policy.ts`](file:///d:/Project/BitLogic/lib/auth/password-policy.ts):
- **Length & Bounds**: Minimum 8 characters. Maximum 72 bytes (strictly enforcing the bcrypt byte limit to prevent silent truncation attacks).
- **Complexity**: Requires mixing both letters and numbers.
- **Leaked & Cracked Password Shield**: In-memory `Set` containing the most common leaked and cracked passwords from SecLists / RockYou, combined with regional Bangladeshi patterns (`bangladesh123`, `dhaka123`, `bitlogic123`, etc.).
- **Repetition Check**: Rejects passwords consisting of repeated single characters (e.g. `11111111`, `aaaaaaaa`).
- **Context-Aware Anti-User Info Reuse**:
  - Rejects passwords matching or containing the user's email username (e.g. `rahim` from `rahim@gmail.com`).
  - Rejects passwords containing tokens of the user's personal name (tokens $\ge 3$ characters).
  - Rejects passwords containing the last 6 digits of the user's mobile phone number.

### Disposable Email Protection
To prevent fraud, abuse, and lost access to paid subscriptions, checkout and user registration run validation through [`lib/email/validate-email.ts`](file:///d:/Project/BitLogic/lib/email/validate-email.ts):
- **100k+ Domain Blocklist**: An optimized database of over 100,000 known temporary and throwaway email domains loaded into an in-memory hash set (`lib/email/disposable-domains.json`).
- **Progressive Subdomain Traversal**: Evaluates wildcards and nested subdomains (e.g., `temp.box.mailinator.com` down to root domain `mailinator.com`).
- **Permanent Consumer Whitelist**: Legitimate major email providers (`gmail.com`, `googlemail.com`, `outlook.com`, `hotmail.com`, `yahoo.com`, `icloud.com`, `proton.me`, `protonmail.com`, `zoho.com`, etc.) are hard-whitelisted and can never be falsely flagged by upstream list updates.

### Transaction & Payment Security Validations
1. **TrxID Anti-Replay Protection**:
   - Every submitted payment transaction ID (TrxID) is checked against the database (`paymentTransaction.findFirst`) inside the transaction client.
   - Duplicate TrxIDs submitted for new checkouts or renewals are rejected with HTTP 409 (`"This transaction ID was already used"`), preventing replay attacks.
   - Indexed via `@@index([trxId])` on `PaymentTransaction` for sub-millisecond lookup speeds.
2. **Bangladeshi Mobile Phone Validation**:
   - Customer checkout strictly validates Bangladesh mobile telephone numbers using `/^(?:\+?8801|01)[3-9]\d{8}$/` (validates standard 11-digit mobile numbers with operator prefixes `013` through `019`).
3. **Gateway Whitelist**:
   - Payment method inputs are checked against a strict whitelist: `['bkash', 'nagad', 'rocket', 'upay', 'bank', 'cash']`. Unauthorized or arbitrary payment method strings are rejected immediately.
4. **Session Invalidation (`sessionVersion`)**:
   - `User.sessionVersion` is embedded into JWT cookies (`sv` claim). When a password is changed, reset, or when an admin forces a logout, `sessionVersion` increments in the database. Every older session token is instantly invalidated on its next request.

---

## Future Features

### 1. Preloaded Customer Wallet & Balance System
- **Concept**: A customer credit wallet stored in BDT directly associated with the buyer's account.
- **Top-up Mechanism**: Customers can top up their wallet balance by sending funds via bKash, Nagad, or bank transfer and submitting the TrxID. Once verified by admin (or payment gateway webhook), the balance is credited.
- **Instant Checkout & Auto-Renewals**:
  - Eliminates manual verification delays: customers with sufficient wallet balance can purchase digital credentials and renew expiring subscriptions with 1-click instant checkout.
  - Optional opt-in automated subscription renewals deducting from available balance before access expires.
  - Complete double-entry ledger tracking top-ups, purchases, refunds, and adjustments.

### 2. Centralized Email Notification Management
- **Concept**: An administrative hub for configuring, previewing, and automating transactional customer emails.
- **Notification Triggers**:
  - Automated credential delivery email containing login details, VPN instructions, and warranty terms immediately upon order fulfillment.
  - Expiration alerts (sent 7 days, 3 days, and 24 hours prior to subscription expiration with direct renewal links).
  - Admin operational notifications: low supplier balance alerts, failed automated dispatch notifications, and warranty claim escalations.
- **Template Customization**: In-app preview and visual branding customization for all transactional notification emails.

---

## Not in scope (now)

- Direct automated bKash/Nagad merchant MFS callback APIs (payments verified by operator or via webhook when merchant accounts are issued).
- Native mobile applications (storefront is fully responsive, PWA-ready, and mobile-native optimized).
