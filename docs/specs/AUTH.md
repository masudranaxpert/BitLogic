# Accounts, passwords and email

## Sessions

- Login sets an httpOnly cookie `bitlogic_session` (JWT signed with `AUTH_SECRET`, `lib/auth/session.ts`).
- The token carries `sv` = the user's `sessionVersion`. `getSession()` re-reads the user on every call, so:
  - a password change/reset, a suspension, or a role/permission change signs that user out everywhere;
  - a deleted user is signed out at once.
- `/admin` is guarded in `middleware.ts` (ADMIN or STAFF). Each admin API also checks
  `requirePermission(key)` / `requireFullAdmin()` (`lib/auth/require-admin.ts`).
- Buyer APIs (orders, chat, tickets, warranty) use `lib/auth/buyer-access.ts`:
  signed-in members see only their own email's orders; guests must send the order's private `accessToken`.

## Password rules (`lib/auth/password-policy.ts`)

At least 8 characters, letters and numbers, at most 72 bytes (bcrypt limit), not a common password,
not containing the email name. Applied on sign-up, reset, change, admin set and staff accounts.

## Flows

| Flow | API | Notes |
|------|-----|-------|
| Sign up | `POST /api/auth/register` | If email is set up and "Verify email on sign-up" is on: account is created unverified, a link is emailed, no session yet. Otherwise signed in straight away. |
| Confirm email | `GET /api/auth/verify-email?token=` | Redirects to `/login?verified=1` or `?verified=invalid`. |
| Resend link | `POST /api/auth/resend-verification` | Same answer whether or not the account exists. |
| Sign in | `POST /api/auth/login` | Unverified customer → 403 `EMAIL_NOT_VERIFIED` (only while email is set up). CRM status suspended → 403 `ACCOUNT_SUSPENDED`. |
| Forgot password | `GET/POST /api/auth/forgot-password` | GET says if email reset is available. POST always gives the same answer. Without email setup the page tells the buyer to contact support. |
| Reset password | `GET/POST /api/auth/reset-password` | Page: `/reset-password?token=`. Link works once, for 1 hour. Password is checked before the link is used up. |
| Change password | `POST /api/account/password` | Needs the current password. Other devices are signed out; this one gets a fresh cookie. |
| Profile | `GET/PATCH /api/account/profile` | Name and phone. Email is the login and stays fixed. Also updates the CRM record. |
| Admin: help a customer | `GET/POST /api/admin/customers/password` | Customers → open one → Profile → Sign-in. "Email reset link", or "Set new password" (typed or generated, shown once). Staff/admin accounts can't be changed here. |

## Rate limits (`lib/auth/rate-limit.ts`, in-memory)

Login 8 per 15 min per IP+email and 40 per IP; sign-up 10 per hour per IP; forgot/resend 3 per 15 min per email;
password change 6 per 15 min; checkout 15 per 10 min; chat 40 per 5 min; tickets 20 per 10 min.
Move this to the DB/Redis when running more than one server.

## Email (Admin → Settings → Email)

Stored in `StoreSetting['emailConfig']`. Passwords and API keys are encrypted and never sent back to the browser.

| Provider | What you need | Free tier (check the provider) |
|----------|---------------|------|
| SMTP | Host, port, username, password. Presets: Gmail (App Password), Outlook, Zoho, Brevo, SendGrid, Mailgun, Amazon SES, custom. | Gmail ~500/day |
| Resend | API key | 3,000/month |
| Brevo | API key | 300/day |
| SendGrid | API key (Mail Send) | — |
| Postmark | Server token | — |
| Mailgun | API key + domain + region | — |

- "Sender email" must be an address or domain the provider has verified.
- "Send test" sends with the saved settings and shows the provider's error if it fails.
- When the provider is **Off** (or setup is incomplete): sign-up signs in without verification,
  forgot-password shows "contact support", and admins can still set a new password by hand.
- Set `APP_URL` in production: email links are built from it.

Code: `lib/email/config.ts` (settings), `lib/email/send.ts` (SMTP via nodemailer + HTTP APIs), `lib/email/templates.ts`.
