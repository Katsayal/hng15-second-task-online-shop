# Implementation Tasks

## Phase 1: Web foundation and local environment — complete

- [x] Initialize Next.js with Tailwind CSS and TypeScript.
- [x] Install application dependencies and Prisma.
- [x] Configure local environment variables.
- [x] Define the Prisma schema and connect it to Neon.

## Phase 2: Google authentication — complete

- [x] Configure Google OAuth through Supabase Auth.
- [x] Implement sign-in, session handling, and JIT Prisma user upsert.
- [x] Protect checkout routes for signed-out users.

## Phase 3: Storefront and local cart — complete for web

- [x] Build the responsive product catalog and product details.
- [x] Build cart drawer and quantity controls.
- [x] Persist the web cart in browser `localStorage`.
- [x] Clear the cart after successful checkout.

## Phase 4: Stripe checkout — complete

- [x] Create server-priced Stripe Checkout Sessions.
- [x] Verify Stripe webhooks and update orders/inventory transactionally.
- [x] Verify local test-mode checkout end to end.

## Phase 5: Mailgun receipts — implemented; production sender setup outstanding

- [x] Send a receipt after successful paid-order processing.
- [x] Verify delivery to an authorized sandbox recipient.
- [ ] Configure and verify a custom Mailgun sending domain for arbitrary
      recipient delivery.

## Phase 6: Monorepo foundation — repository changes complete

- [x] Move the existing website, API routes, Prisma schema, and scripts to
      `apps/web`.
- [x] Add root npm-workspace commands while keeping one root lockfile.
- [x] Configure the root Netlify build command to build the web workspace.
- [x] Move the local environment template and ignored `.env.local` into
      `apps/web`.
- [x] Document the existing backend and mobile integration gaps.
- [x] In Netlify build settings, keep the base directory at the repository
      root and set the package directory to `apps/web`.

## Phase 7: Shared backend cart and mobile app — complete

- [x] Select the simplest mobile framework suitable for the assessment (Expo with React Native and TypeScript).
- [x] Scaffold the mobile app as a separate workspace under `apps/mobile`.
- [x] Configure mobile Supabase sign-in against the same project/user accounts
      as web.
- [x] Extend authenticated API routes to accept both the web cookie session
      and a validated mobile Supabase bearer token.
- [x] Expose the product catalog through a backend API route for mobile.
- [x] Add a per-user server-side cart model and authenticated cart API to the
      existing Next.js backend.
- [x] Make the website load and persist the authenticated user's server cart
      instead of relying only on `localStorage`.
- [x] Make mobile load and persist the same server cart.
- [x] Verify web-to-mobile and mobile-to-web cart synchronization using the
      nine-step flow in `prd.md`.
- [x] Confirm checkout still calculates trusted prices and validates stock on
      the server.

## Project working rules

- Simple is king. Avoid unnecessary abstractions, dependencies, and
  infrastructure.
- Do not run `npm run build` unless explicitly asked.
- Never inspect `.env.local`; inspect `.env.example` for variable names.
- Make the smallest relevant change and run the narrowest useful checks.
