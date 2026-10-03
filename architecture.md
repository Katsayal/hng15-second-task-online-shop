# System Architecture Document

## Core Tech Stack
* **Framework:** Next.js (App Router)
* **Primary Relational Database:** Neon (Serverless Postgres)
* **Object-Relational Mapping (ORM):** Prisma
* **Authentication Provider:** Supabase Auth (configured with Google Cloud Console OAuth 2.0 Credentials)
* **Media Cloud Storage:** Supabase Storage (for static product images)
* **Payment Handler:** Stripe Checkout (Hosted flow)
* **Transactional Email Engine:** Mailgun API

## Database Entity Relationship Diagram (Prisma Schema Reference)
This schema must be used verbatim to prevent data type mismatches across generated API endpoints.

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

## System Topology & Data Lifecycle
1. **Browse:** Frontend ➔ Fetches products from **Neon Postgres** via Prisma.
2. **Auth:** User logs in ➔ Handled by **Supabase Auth** via Google OAuth client IDs.
3. **Checkout Initiated:** Client state (Cart) ➔ Sent to Next.js API route ➔ Server calls **Stripe API** to yield a Checkout Link.
4. **Fulfillment:** Stripe Webhook ➔ Next.js Hook Route ➔ Database status mutation via **Prisma** ➔ Fires transactional event payload to **Mailgun**.
