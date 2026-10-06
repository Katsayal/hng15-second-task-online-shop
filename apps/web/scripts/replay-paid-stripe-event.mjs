import { config } from "dotenv";
import Stripe from "stripe";

config({ path: ".env.local" });

const eventId = process.argv[2];
const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!eventId?.startsWith("evt_")) {
  throw new Error("Usage: node scripts/replay-paid-stripe-event.mjs <event_id>");
}

if (!secretKey?.startsWith("sk_test_")) {
  throw new Error("Event replay is restricted to Stripe test mode.");
}

if (!webhookSecret?.startsWith("whsec_")) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
}

if (!appUrl) {
  throw new Error("Missing NEXT_PUBLIC_APP_URL.");
}

const webhookUrl = new URL("/api/webhooks/stripe", appUrl);
if (!["localhost", "127.0.0.1"].includes(webhookUrl.hostname)) {
  throw new Error("Event replay may only target a local development server.");
}

const stripe = new Stripe(secretKey);
const event = await stripe.events.retrieve(eventId);

if (
  event.type !== "checkout.session.completed" ||
  event.data.object.object !== "checkout.session" ||
  event.data.object.payment_status !== "paid"
) {
  throw new Error("Only paid checkout.session.completed events can be replayed.");
}

const payload = JSON.stringify(event);
const signature = Stripe.webhooks.generateTestHeaderString({
  payload,
  secret: webhookSecret,
});
const response = await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "stripe-signature": signature,
  },
  body: payload,
});

console.log(`Replayed ${event.type} to local webhook: HTTP ${response.status}`);
if (!response.ok) {
  console.error(await response.text());
  process.exitCode = 1;
}
