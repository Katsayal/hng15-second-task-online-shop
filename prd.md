# Product Requirements Document (PRD)

## Project Overview
A highly streamlined, lightning-fast e-commerce shop built for efficiency and speed. The application minimizes database infrastructure by utilizing local browser storage for cart tracking, executing transactional actions via API endpoints during checkouts, and securing access via Google OAuth.

## Target Audience
General consumer retail buyers looking for a straightforward, frictionless click-and-buy shopping experience.

## Functional Requirements

### 1. User Identity & Authentication
* **Google OAuth Login:** Users must be able to sign up and log in using their Google account via Supabase Auth.
* **Session Guarding:** Public routes allow browsing. The checkout flow and user order history pages are protected and require active authentication.
* **Just-In-Time (JIT) Database Sync:** To keep the infrastructure simple, when a user successfully authenticates via Supabase, the application layer will check the Neon database via Prisma. If the user record does not exist in Neon, it will be automatically upserted on-the-fly (e.g., during login completion or right before checkout tokenization) to ensure relational integrity without complex database triggers.

### 2. Product Catalog
* **Dynamic Grid View:** A clean main landing page showing a grid of available products fetched from the Neon database.
* **Product Detail Pages:** Individual dynamic item views detailing description, pricing, and sizing/variants if applicable.

### 3. Shopping Cart Management
* **Client-Side Persistence:** Products added to the cart are stored inside the browser's `localStorage` (no database writes during shopping).
* **Cart Operations:** Users can add, modify quantities, or remove items instantly.

### 4. Checkout Pipeline
* **Secure Payment Processing:** Transition client-side cart items into a secure server-side Stripe Checkout Session.
* **Pricing Verification:** Absolute pricing totals are computed directly on the server from the Neon database records to prevent client-side tampering.

### 5. Automated Fulfillment Notifications
* **Stripe Webhook Triggers:** Listen for verified successful transactions from Stripe.
* **Database Updates:** Update product inventory quantities and order records in Neon Postgres upon successful payment.
* **Transactional Receipts:** Instantly send clean, structured HTML confirmation emails to the buyer via Mailgun.
