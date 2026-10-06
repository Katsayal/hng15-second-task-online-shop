# Product Requirements Document

## Project overview

HNG Shop is a simple online storefront with a shared backend for web and a
planned mobile app. The mobile app must use the same API and user identity as
the deployed website. The shared cart is the main requirement of this phase.

## Audience

Retail customers and anonymous assessors evaluating the end-to-end shopping
experience across web and mobile.

## Existing web requirements

### Identity and authentication

- Users browse the public catalog and use Google sign-in through Supabase Auth.
- Checkout is restricted to authenticated users.
- Successful authentication creates or updates the corresponding user in
  Neon through Prisma.

### Catalog and checkout

- The catalog and product details are read from Neon.
- Checkout uses current server-side product prices and Stripe Checkout.
- A verified paid Stripe webhook updates the order and stock in a database
  transaction.
- Successful paid orders trigger a receipt email through Mailgun.

## Mobile application requirements

- Add a mobile client in the monorepo. The framework is not selected yet; pick
  the simplest suitable option before scaffolding it.
- Mobile and web sign in to the same Supabase project and resolve to the same
  user account.
- Mobile uses the same deployed Next.js backend for catalog, cart, and checkout
  operations. Expose catalog and cart operations through API routes in this
  phase; do not duplicate database or payment business logic in mobile.
- A signed-in user's cart is stored server-side and is shared by web and
  mobile. The server is the source of truth for cross-device cart contents.
- Cart changes made on either client must be visible in the other after it
  refreshes/loads the shared cart. Real-time push is not required for the
  assessment flow unless later requested.
- Product prices and available stock remain server-authoritative; do not trust
  mobile-supplied prices or totals.

## Required assessment flow

1. Open the web application and sign up/sign in with a new account.
2. Show that web sign-in succeeded.
3. Add a product to the web cart.
4. Open the mobile app.
5. Sign in on mobile with the same account.
6. Show the web-added product in the mobile cart.
7. Add another product from mobile.
8. Return to the web application.
9. Show the mobile-added product in the web cart.

The existing cart uses browser `localStorage`, and no server-side cart
endpoints or cart tables exist yet. Implement those as part of this phase.

## Working principles

- Simple is king: prefer the clearest adequate approach; avoid unnecessary
  abstractions, dependencies, and infrastructure.
- Do not run `npm run build` unless explicitly requested.
- Do not inspect `.env.local`; use `.env.example` for variable names.
- Validate with the smallest relevant checks and avoid unrelated changes.
