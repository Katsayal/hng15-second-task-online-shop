# HNG Shop

Next.js storefront using Neon Postgres, Prisma, and Supabase Auth.

## Run locally

Run the development server from the project root:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Configure `.env.local` using `.env.example`.

The Prisma application client allows up to 30 seconds to establish a new
PostgreSQL connection, giving an autosuspended Neon compute time to wake on the
first request. No separate wake command is required.

## Google sign-in setup

1. Create a Google OAuth web client and set its redirect URI to `https://<your-supabase-project>.supabase.co/auth/v1/callback`.
2. In Supabase, enable Google under **Authentication → Sign In / Providers** and enter that client ID and secret.
3. Add `http://localhost:3000/auth/callback` to the Supabase **Authentication → URL Configuration → Redirect URLs** allowlist.
4. Set the Supabase project URL and anon key in `.env.local`. Keep the Google OAuth client ID and secret configured in Supabase.
5. Start the app and use **Sign in**. The auth callback upserts the signed-in user into Neon with Prisma.

Checkout and order routes are protected by `src/proxy.ts`.

## Add products

The catalog reads directly from Neon. To add products during development, run
`npx prisma studio` from the project root and create records in the `Product`
table. Set `stockQuantity` above zero to enable adding the product to the cart.

## Stripe checkout development

Checkout creates Stripe line items using current product prices read on the
server; it does not trust prices or totals from the browser. The
`/api/webhooks/stripe` endpoint verifies Stripe signatures before updating an
order and decrementing inventory.

For local webhook testing, install the Stripe CLI using the official
[installation instructions](https://docs.stripe.com/stripe-cli), then log in
and forward Stripe events to the local app:

```bash
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to localhost:3000/api/webhooks/stripe
```

The listener prints a `whsec_...` signing secret. If a listener secret was
shared or exposed, stop that listener and start a new one; only use the new
secret. Put that value in
`STRIPE_WEBHOOK_SECRET` in `.env.local` and restart `npm run dev` so Next.js
loads it. This listener secret is distinct from an endpoint signing secret
created in the Stripe Dashboard.

Complete a checkout with the test card `4242 4242 4242 4242`, any future
expiry date, and any CVC. Stripe test mode does not charge real money. In the
listener terminal, confirm the checkout event is delivered and receives an
HTTP `200`. Then use `npx prisma studio` to confirm the order is `paid`, its
`stripePaymentIntentId` is set, and the purchased product's stock decreased.

If a paid local test event already received `500`, rotate the listener secret,
update `STRIPE_WEBHOOK_SECRET`, and restart the app. With the new listener and
app running, replay the original event safely using its `evt_...` ID:

```bash
node scripts/replay-paid-stripe-event.mjs evt_your_event_id
```

The helper retrieves the event from Stripe using the test API key, only accepts
a paid Checkout completion, and only posts to localhost. Check that it reports
HTTP `200`, then verify the order and stock in Prisma Studio.

Configure the same endpoint and event types in the Stripe Dashboard for
deployment: `checkout.session.completed`,
`checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, and `checkout.session.expired`.

## Mailgun receipts

Successful paid Checkout events send an order receipt through Mailgun after
the order and inventory transaction commits. Set `MAILGUN_API_KEY`,
`MAILGUN_DOMAIN`, and `MAILGUN_BASE_URL` in `.env.local`; use
`https://api.mailgun.net` for US Mailgun accounts or
`https://api.eu.mailgun.net` for EU accounts. Mailgun sandbox domains can only
send to recipient addresses explicitly authorized in Mailgun. For general
delivery, configure and verify your sending domain and its DNS records in
Mailgun. A Mailgun send failure returns an error to Stripe so its webhook
delivery is retried.
