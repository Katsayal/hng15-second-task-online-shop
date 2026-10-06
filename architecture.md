# System Architecture

## Monorepo layout

```text
apps/
  web/       Existing Next.js storefront and API routes
  mobile/    Planned mobile client; framework not selected yet
packages/    Add shared packages only when both clients need stable shared code
```

The repository uses npm workspaces. The web app remains the sole backend for
now: its existing Next.js route handlers are deployed on Netlify and are the
API surface mobile will call. Keep the web app's public route paths stable.
Do not split the backend into another service without a concrete requirement.

The repository root owns the workspace lockfile and developer-facing
commands. Web source, Prisma schema/config, scripts, and local environment
template are in `apps/web`. Local secrets belong in `apps/web/.env.local`;
never commit or inspect that file.

## Current stack

- Web framework: Next.js App Router
- Database: Neon Postgres
- ORM: Prisma
- Authentication: Supabase Auth with Google OAuth
- Payments: Stripe Checkout and signed webhooks
- Receipts: Mailgun
- Web deployment: Netlify
- Mobile framework: not selected

## Current data model

The current Prisma schema contains `User`, `Product`, `Order`, and `OrderItem`.
`User.id` is the Supabase Auth user ID. Orders and inventory are stored in
Neon. There is currently no cart model.

## Current request/data flow

1. The Next.js web app reads products from Neon through Prisma.
2. Supabase Auth signs users in; the web callback upserts the user in Neon.
3. The web cart is currently client-side `localStorage` only.
4. `/api/checkout` reads requested product IDs and quantities, then calculates
   prices from Neon and creates a Stripe Checkout Session.
5. `/api/webhooks/stripe` verifies Stripe signatures, marks the order paid,
   and decrements stock in one Prisma transaction.
6. After that transaction commits, the webhook sends the Mailgun receipt.
   Mailgun failure is logged separately and does not undo the paid order.

## Mobile cart phase: required changes

The current API route handlers are checkout and Stripe webhook. Product
catalogue reads are currently done by web server components rather than a
public API route, there are no cart endpoints, and checkout obtains the user
from the web Supabase cookie session. Add the small API surface needed by
mobile rather than duplicating database logic in the app.

Implement the simplest secure shared-cart path before treating mobile cart
sync as complete:

- Add a server-side cart representation keyed to the authenticated Supabase
  user, with product references and quantities.
- Add a product catalogue read route and authenticated cart read/update/remove
  operations to the existing web API. Keep the web's current API base host and
  reuse these routes from mobile.
- Support the web's Supabase cookie session and mobile's Supabase bearer access
  token on authenticated API requests. Derive the user ID from the validated
  session/token, never from a client-supplied user ID.
- Use the server cart as the source of truth for both clients. Load it after
  sign-in and persist each cart change so switching clients shows the updated
  cart.
- Keep checkout pricing and stock validation on the server.
- Verify bidirectional synchronization using the nine-step assessment flow in
  `prd.md`.

Do not add realtime infrastructure, offline sync, or a shared-code package
until the assessment requires it. Extract shared contracts/types only when
both clients actually consume the same stable definitions.

## Existing Prisma schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id // Matches Supabase Auth User UID
  email     String   @unique
  fullName  String?
  createdAt DateTime @default(now())
  orders    Order[]
}

model Product {
  id            String      @id @default(uuid())
  name          String
  description   String?
  price         Decimal     @db.Decimal(10, 2)
  stockQuantity Int         @default(0)
  imageUrl      String?
  createdAt     DateTime    @default(now())
  orderItems    OrderItem[]
}

model Order {
  id                    String      @id @default(uuid())
  userId                String
  user                  User        @relation(fields: [userId], references: [id])
  totalAmount           Decimal     @db.Decimal(10, 2)
  stripePaymentIntentId String?     @unique
  status                String      @default("pending") // pending, paid, shipped, cancelled
  createdAt             DateTime    @default(now())
  orderItems            OrderItem[]
}

model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  quantity        Int
  priceAtPurchase Decimal  @db.Decimal(10, 2)
}
```

## Working preferences for contributors and agents

- Keep changes simple, targeted, and consistent with the existing patterns.
- Do not add abstraction or infrastructure without a concrete need.
- Do not run `npm run build` unless the user explicitly asks.
- Do not open or print `.env.local`; use `apps/web/.env.example` for variable
  names and structure.
- Run only focused validation relevant to the change and explain any checks
  that were not run.
