# Accounts, Authentication & Email Specification

## Sessions

- Login sets an httpOnly cookie `bitlogic_session` containing a JWT signed with `AUTH_SECRET` via `jose` (`lib/auth/session.ts`).
- The JWT payload carries `sv` = the user's `sessionVersion`. `getSession()` reads the user record on every call:
  - Any password change or reset, user suspension, or role/permission update increments `sessionVersion`, instantly signing out all existing sessions across devices.
  - A deleted user's session is terminated immediately.
- `/admin` routes are guarded in `middleware.ts` (requiring `ADMIN` or `STAFF` roles). Each admin API endpoint also explicitly verifies permissions via `requirePermission(key)` or `requireFullAdmin()` (`lib/auth/require-admin.ts`).
- Buyer APIs (orders, chat, tickets, warranty) authenticate via `lib/auth/buyer-access.ts`:
  - Signed-in customers access orders matching their authenticated email.
  - Guest buyers access order details via the unguessable `accessToken` generated at checkout.

---

## Password Policy (`lib/auth/password-policy.ts`)

BitLogic enforces a smart, zero-dependency password security policy (Ponytail style):
- **Length & Boundary**: Minimum 8 characters. Maximum 72 bytes (strictly enforcing the bcrypt byte limit to prevent silent truncation attacks).
- **Complexity**: Must contain both letters and numbers.
- **Leaked & Cracked Password Shield**: In-memory `Set` containing the most common leaked and cracked passwords from SecLists / RockYou, combined with regional Bangladeshi patterns (`bangladesh123`, `dhaka123`, `bitlogic123`, etc.).
- **Character Repetition**: Rejects passwords consisting of repeated single characters (e.g. `11111111`, `aaaaaaaa`).
- **Context-Aware Anti-User Info Reuse**:
  - Rejects passwords matching or containing the user's email username (e.g. `rahim` from `rahim@gmail.com`).
  - Rejects passwords containing tokens of the user's personal name (tokens $\ge 3$ characters).
  - Rejects passwords containing the last 6 digits of the user's mobile phone number.
- Applied consistently across customer sign-up, password reset, account password change, and staff account creation.

---

## Disposable Email Protection (`lib/email/validate-email.ts`)

Checkout and registration strictly reject throwaway/temporary email providers:
- **100k+ Domain Blocklist**: An in-memory hash set of 100,143 known disposable domains (`lib/email/disposable-domains.json`).
- **Progressive Subdomain Traversal**: Evaluates wildcards and nested subdomains down to the root domain.
- **Permanent Consumer Whitelist**: Legitimate major email providers (`gmail.com`, `googlemail.com`, `outlook.com`, `hotmail.com`, `yahoo.com`, `icloud.com`, `proton.me`, `protonmail.com`, `zoho.com`, etc.) are permanently whitelisted and can never be blocked.

---

## Flows

| Flow | Endpoint | Description |
|---|---|---|
| **Sign up** | `POST /api/auth/register` | If email provider is configured and "Verify email on sign-up" is enabled: creates user with `emailVerifiedAt = null`, sends one-time verification link. Otherwise marks verified and signs in immediately. Validates disposable email and password policy. |
| **Confirm email** | `GET /api/auth/verify-email?token=` | Validates `AuthToken` hash; marks user verified and redirects to `/login?verified=1`. |
| **Resend link** | `POST /api/auth/resend-verification` | Issues a new verification link. Uniform response to prevent account enumeration. |
| **Sign in** | `POST /api/auth/login` | Audits attempt in `LoginEvent`. Checks unverified status (403 `EMAIL_NOT_VERIFIED`) and CRM suspension (403 `ACCOUNT_SUSPENDED`). Issues JWT session cookie. |
| **Forgot password** | `GET/POST /api/auth/forgot-password` | Generates 1-hour `AuthToken` (`reset_password`) and emails the reset link. Returns uniform response. |
| **Reset password** | `GET/POST /api/auth/reset-password` | Validates token, checks new password against policy, updates `passwordHash`, increments `sessionVersion`, and marks token used. |
| **Change password** | `POST /api/account/password` | Authenticated customer flow. Verifies current password, updates to new password, increments `sessionVersion`, and re-issues a fresh session cookie for the active device. |
| **Profile** | `GET/PATCH /api/account/profile` | Updates customer name and phone. Keeps the CRM `AdminSubscriber` record synchronized. |
| **Admin Password Assistance** | `GET/POST /api/admin/customers/password` | Admin console tool to either trigger an emailed reset link or manually set an admin-generated temporary password for a customer. |

---

## Rate Limits (`lib/auth/rate-limit.ts`)

In-memory sliding window rate limits (see [ADR-008](../adr/ADR-008-in-memory-zero-dependency-vs-redis.md)):
- **Login**: 8 attempts per 15 minutes per IP+email; 40 per IP
- **Sign-up**: 10 attempts per hour per IP
- **Password Reset / Resend**: 3 requests per 15 minutes per email
- **Password Change**: 6 requests per 15 minutes
- **Checkout**: 15 requests per 10 minutes per IP
- **Chat**: 40 messages per 5 minutes
- **Support Tickets**: 20 requests per 10 minutes

---

## Email Configuration (Admin → Settings → Email)

Settings stored in `StoreSetting['emailConfig']`. SMTP credentials and API keys are stored encrypted at rest via AES-256-GCM.

| Provider | Configuration Requirements | Typical Allowance |
|---|---|---|
| **SMTP** | Host, port, username, encrypted password. Presets for Gmail App Passwords, Outlook, Zoho, Brevo, SendGrid, Mailgun, Amazon SES, or custom SMTP. | Gmail ~500/day |
| **Resend** | Encrypted API key | 3,000/month |
| **Brevo** | Encrypted API key | 300/day |
| **SendGrid** | Encrypted API key (Mail Send) | Custom |
| **Postmark** | Encrypted Server token | Custom |
| **Mailgun** | Encrypted API key + sending domain + region | Custom |

- **Fallback Behavior**: When the email provider is disabled or not yet configured:
  - Registration signs the user in immediately without requiring verification.
  - Forgot-password gracefully directs buyers to customer support.
  - Admins can still set customer passwords directly from the console.
- **Production Setting**: `APP_URL` must be set in the production environment to construct valid verification and reset URLs.
