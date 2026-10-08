# HNG Shop

The repository is an npm-workspaces monorepo. The existing storefront and its
backend API routes live in `apps/web`. A mobile client will be added as a
separate app when its framework is selected; it should use the existing web
API rather than duplicate backend logic.

## Local development

Install dependencies from the repository root:

```bash
npm install
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the values
locally. Never commit `.env.local` or share its contents.

Start the website from the repository root:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Other root commands:

```bash
npm run lint
npm run db:migrate
npm run db:studio
npm run seed:demo
```

The Prisma application client allows up to 30 seconds to establish a new
PostgreSQL connection, giving an autosuspended Neon compute time to wake on the
first request.

## Google sign-in setup

1. Create a Google OAuth web client and set its redirect URI to
   `https://<your-supabase-project>.supabase.co/auth/v1/callback`.
2. In Supabase, enable Google under **Authentication → Sign In / Providers**
   and enter that client ID and secret.
3. Add `http://localhost:3000/auth/callback` to the Supabase
   **Authentication → URL Configuration → Redirect URLs** allowlist.
4. Set the Supabase project URL and anon key in `apps/web/.env.local`. Keep the
   Google OAuth client ID and secret configured in Supabase.
5. Start the app and use **Sign in**. The auth callback upserts the signed-in
   user into Neon with Prisma.

Checkout and order routes are protected by `apps/web/src/proxy.ts`.

## Add products

The catalog reads directly from Neon. Run `npm run db:studio` from the
repository root and create records in the `Product` table. Set
`stockQuantity` above zero to enable adding the product to the cart.

`npm run seed:demo` creates missing demo products and sets stock to 21 for the
two demo products and the temporary Stripe test product. It changes stock in
the database configured by `apps/web/.env.local`; use it only when that reset
is intended.

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
secret. Put that value in `STRIPE_WEBHOOK_SECRET` in
`apps/web/.env.local` and restart `npm run dev` so Next.js loads it. This
listener secret is distinct from an endpoint signing secret created in the
Stripe Dashboard.

Complete a checkout with the test card `4242 4242 4242 4242`, any future
expiry date, and any CVC. Stripe test mode does not charge real money. In the
listener terminal, confirm the checkout event is delivered and receives an
HTTP `200`. Then use `npm run db:studio` to confirm the order is `paid`, its
`stripePaymentIntentId` is set, and the purchased product's stock decreased.

If a paid local test event already received `500`, rotate the listener secret,
update `STRIPE_WEBHOOK_SECRET`, and restart the app. With the new listener and
app running, replay the original event safely using its `evt_...` ID:

```bash
npm run replay:paid-event -- evt_your_event_id
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
`MAILGUN_DOMAIN`, and `MAILGUN_BASE_URL` in `apps/web/.env.local`, using the API
base URL for your Mailgun account's region. Mailgun sandbox domains can only
send to recipient addresses explicitly authorized in Mailgun. For general
delivery, configure and verify your sending domain and its DNS records in
Mailgun. A receipt delivery failure is logged separately and does not fail
the already processed payment webhook.

## Netlify deployment

Keep the repository root as Netlify's base directory so npm installs from the
root workspace lockfile. In Netlify's build settings, set the site's **Package
directory** to `apps/web`. The root `netlify.toml` runs `npm run build`, which
delegates to the web workspace. Keep production environment variables
configured in Netlify.

Keep credentials such as `DATABASE_URL`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, and `MAILGUN_API_KEY` marked as secret. Values that
must be present in client bundles or are public configuration, including
`NEXT_PUBLIC_*`, `MAILGUN_BASE_URL`, and `MAILGUN_DOMAIN`, must not be marked
as secret. Netlify's secret scanner excludes only the web app's generated
Turbopack cache; scanning remains enabled for source files and deployable
build output.

## Mobile app and cart synchronization

The mobile app lives in `apps/mobile` built with Expo, React Native, and TypeScript.
Both the website and mobile app communicate with the same Next.js backend and
Neon database:

- Start the mobile client from the repository root:
  ```bash
  npm run mobile
  ```
- Copy `apps/mobile/.env.example` to `apps/mobile/.env.local` to configure
  `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Both clients share the server-side cart via `/api/cart`.
- Authenticated requests accept both web cookie sessions and mobile Supabase bearer
  tokens, deriving the user identity securely on the server.
- Cart changes made on either client are immediately persisted and visible on the
  other upon reload or refresh, satisfying the nine-step assessment flow.

## Working preferences

- Simple is king: prefer a straightforward, maintainable solution over
  unnecessary abstractions or dependencies.
- Do not run `npm run build` unless explicitly asked.
- Never inspect `.env.local`; use `.env.example` for environment-variable
  names and structure.
- Make targeted changes, validate with the smallest relevant checks, and avoid
  unrelated work.
