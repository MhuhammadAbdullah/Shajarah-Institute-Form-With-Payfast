# Shajarah Institute — Registration & Payment System

A production-ready registration and payment platform for Shajarah Institute's programs, courses, workshops, and
events, built on Next.js 15 (App Router) with PayFast Pakistan Hosted Checkout for payments.

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Forms:** React Hook Form + Zod
- **Database:** PostgreSQL + Prisma ORM
- **Payments:** PayFast Pakistan Hosted Checkout
- **Email:** Nodemailer (SMTP)
- **Admin auth:** Signed JWT session cookie (jose) + bcrypt password hashing

## Registration & Payment Flow

1. Student fills out the registration form on the homepage.
2. The form is validated client-side (Zod) and again server-side in `/api/register`.
3. A `Registration` row is created with `paymentStatus = PENDING` and a unique Basket ID (`REG-<year>-<sequence>`).
4. The server requests a one-time access token from PayFast (`GetAccessToken`).
5. The browser is auto-redirected to PayFast's hosted checkout page with the signed fields.
6. After payment, PayFast redirects the customer to `/payment/success` or `/payment/failed` — **these pages are
   informational only and never mark a payment as paid.**
7. PayFast calls `/api/payfast/ipn` server-to-server with the transaction result. This is the **only** place a
   registration is marked `PAID`, after the validation hash, error code, and amount are all verified.
8. On successful verification, a confirmation email is sent and the registration is enrolled.

## Folder Structure

```
app/                     Routes (App Router)
  api/register/          POST — create registration + start PayFast checkout
  api/payfast/ipn/       POST — PayFast server-to-server callback
  api/admin/             Admin-only API routes (CSV export, etc.)
  payment/success|failed Informational post-checkout pages
  admin/                 Admin dashboard (login, list, detail)
actions/                 Next.js Server Actions (admin login/logout)
components/              UI + feature components
config/                  Environment variable loading/validation
constants/               Static lookup values (programs, PayFast endpoints)
emails/                  Email templates
hooks/                   Client-side React hooks
lib/                     Framework-agnostic core (Prisma client, PayFast client, auth, rate limiting)
middleware.ts            Route protection, CSRF/origin checks, security headers
middleware/              Middleware helper modules
prisma/                  Prisma schema + seed script
services/                Business logic (registration, payment, email, admin queries)
types/                   Shared TypeScript types
utils/                   Small stateless helpers
validators/              Zod schemas
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in your PostgreSQL connection string, PayFast merchant credentials, SMTP credentials, and a random
`ADMIN_SESSION_SECRET` (32+ characters).

### 3. Set up the database

```bash
npm run db:migrate   # creates tables from prisma/schema.prisma
npm run db:seed       # creates the first admin user from ADMIN_EMAIL / ADMIN_PASSWORD
```

### 4. Run the app

```bash
npm run dev
```

- Registration form: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin/login

## PayFast Configuration Notes

- `PAYFAST_ENV=sandbox` uses PayFast's UAT endpoints (`ipguat.apps.net.pk`); switch to `production` (`ipg1.apps.net.pk`)
  once your merchant account is live.
- `PAYFAST_RETURN_URL` / `PAYFAST_CANCEL_URL` are where the *customer's browser* lands after checkout.
- `PAYFAST_IPN_URL` must be a publicly reachable URL (PayFast calls it server-to-server) — during local development
  use a tunnel (e.g. ngrok) and register that URL with PayFast.
- The IPN validation hash is computed as `SHA256(BasketID|SecureKey|MerchantID|err_code)` and compared against the
  `validation_hash` PayFast sends. Requests that fail this check, have a mismatched amount, or reference an unknown
  Basket ID are rejected and never mark a registration as paid. See `lib/payfast/hash.ts` and
  `services/payment.service.ts`.

## Admin Dashboard

- Sign in at `/admin/login` with the account created by `npm run db:seed`.
- `/admin/dashboard` — summary counters (pending/paid/failed/total).
- `/admin/registrations` — searchable, filterable, paginated list with CSV export.
- `/admin/registrations/[id]` — full registration + payment attempt history.

## Security

- All input is validated server-side with Zod regardless of client-side validation.
- Prisma parameterizes all queries (no raw SQL string interpolation).
- IPN callbacks are verified via SHA-256 hash, error code, amount match, and duplicate-processing checks before any
  database write.
- Admin routes are protected by a signed, httpOnly, `sameSite=lax` session cookie checked in `middleware.ts`.
- POST requests to browser-facing API routes are rejected if their `Origin` header doesn't match the app's own host
  (PayFast's IPN endpoint is explicitly exempted, since it's a server-to-server call).
- Basic in-memory rate limiting on `/api/register` and the admin login action.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are applied
  to every response.

## Scripts

| Script              | Description                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`        | Start the dev server                      |
| `npm run build`      | Production build                          |
| `npm run start`      | Start the production server               |
| `npm run lint`       | Run ESLint                                 |
| `npm run db:migrate` | Run Prisma migrations                     |
| `npm run db:generate`| Regenerate the Prisma client              |
| `npm run db:studio`  | Open Prisma Studio                        |
| `npm run db:seed`    | Create/update the initial admin user      |
