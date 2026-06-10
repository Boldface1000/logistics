# EasyBlue Logistics — Deployment & Operations

A single source of truth for shipping EasyBlue from a fresh clone to a
production-ready live deployment on Lovable Cloud.

---

## 0. Prerequisites

- A Lovable workspace on the **Pro plan** (required for custom domains,
  payments, and traffic past hobby tier).
- Lovable Cloud enabled on the project (already done).
- A Gmail account with **2-step verification on** so you can generate an
  App Password (16-char string) for the OTP sender.
- A Firebase project for push notifications (optional at first — the system
  falls back to `console.log` if the FCM env vars are missing).

---

## 1. Local install

```bash
bun install
bun run dev   # opens the editor preview
```

The dev server reads `.env` automatically. Cloud-managed env vars
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, etc.) are injected by
the Lovable runtime — do not commit production secrets to `.env`.

---

## 2. Secrets to configure

Set these in **Cloud → Connectors → Secrets** (preview and production each
have their own scope). They are exposed to server functions via
`process.env.*` and never reach the browser bundle.

### Required for OTP email

| Name | Where to get it |
| --- | --- |
| `GMAIL_USER` | Your sender Gmail address, e.g. `noreply.easyblue@gmail.com` |
| `GMAIL_APP_PASSWORD` | Google Account → Security → 2-Step Verification → App passwords (pick "Mail", any device name). Paste the 16-char string with no spaces. |

> **Production scaling**: Gmail App Passwords are capped at ~500
> recipients/day. Before public launch, swap the OTP transport for **Resend**
> (built-in Lovable connector). The implementation only needs the `sendEmail`
> helper inside `src/lib/otp.functions.ts` to be swapped.

### Required for push notifications

| Name | Where to get it |
| --- | --- |
| `FCM_PROJECT_ID` | Firebase Console → Project settings → General → Project ID |
| `FCM_CLIENT_EMAIL` | Firebase Console → Project settings → Service accounts → Generate new private key → `client_email` field of the JSON |
| `FCM_PRIVATE_KEY` | Same JSON file → `private_key` field. Paste the entire `-----BEGIN PRIVATE KEY-----...END PRIVATE KEY-----` block, including `\n` newlines. |

If any of these is missing, `sendPush()` returns `{ delivered: 0, mode:
"log" }` — the app still works, just no real device delivery.

### Optional / advanced

| Name | Purpose |
| --- | --- |
| `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME` | Surfaced on the customer checkout screen so they can transfer manually. |

---

## 3. Database

All schema is checked into version control as Lovable Cloud migrations.
Applying happens automatically on every save in the editor; nothing manual is
required. If you need to reset locally:

```bash
# only run against a dev project — destroys data
bunx supabase db reset
```

Tables in the production schema:

- `profiles`, `user_roles`
- `vendors`, `riders`, `products`, `vendor_stocks`
- `orders`, `order_items`, `shipments`, `telemetry_events`
- `otp_codes`, `rate_limits` (server-only)
- `payments`, `receipts`
- `push_subscriptions`
- `bank_transfer_proofs`

Every public table has explicit `GRANT` + RLS policies. Role checks go
through the `has_role()` security-definer function so RLS policies never
recurse on the `user_roles` table.

---

## 4. Storage buckets

| Bucket | Public? | Purpose |
| --- | --- | --- |
| `avatars` | private | Profile photos. Served via signed URLs. |
| `payment-proofs` | private | Customer-uploaded bank transfer screenshots. |
| `nin-photos` | private | Rider NIN ID proof. Admin-readable. |
| `receipts` | private | Server-generated delivery receipts (PDF). |

---

## 5. The critical path (smoke test)

After publish, exercise the end-to-end flow:

1. `/auth` → sign up as `customer` → receive 6-digit code by email → enter
   → land on `/dashboard`.
2. Repeat with `vendor` and `rider` (vendor + rider land on
   `/pending-approval` until super admin approves).
3. As super admin, approve the vendor and rider.
4. As customer, place a local-delivery order. Upload a bank transfer proof.
5. As super admin, approve the proof. Order flips to `paid` in realtime.
6. As logistics admin, assign the order to the approved rider.
7. As rider, accept the order. Move (geolocation upserts every 10s).
8. Customer sees rider position update on the tracking screen.
9. Rider scans the customer's delivery QR → order marked `delivered`.
10. Customer pulls their PDF receipt from the order detail screen.

---

## 6. Costs at scale (rough, monthly)

| Component | At 2M monthly users |
| --- | --- |
| Lovable Cloud (Postgres + Auth + Realtime + Storage) | $200–500 depending on traffic shape |
| Email transport (Resend after Gmail swap) | $100–300 |
| FCM push | Free |
| Custom domain | $0 (you buy the domain elsewhere) |
| Lovable Pro hosting | $25 |

---

## 7. Single-command ship

```bash
bun run scripts/deploy.sh
```

This installs, typechecks, builds, and verifies secrets. The actual deploy
trigger for frontend is **Publish** in the editor; backend deploys
automatically on every commit.
