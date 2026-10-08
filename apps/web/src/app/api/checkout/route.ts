import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getAppUrl, getStripeClient } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

type RequestedItem = {
  productId: string;
  quantity: number;
};

function parseItems(value: unknown): RequestedItem[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }

  const quantities = new Map<string, number>();
  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      !("productId" in item) ||
      !("quantity" in item) ||
      typeof item.productId !== "string" ||
      item.productId.length === 0 ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100
    ) {
      return null;
    }

    const quantity = (quantities.get(item.productId) ?? 0) + item.quantity;
    if (quantity > 100) return null;
    quantities.set(item.productId, quantity);
  }

  return [...quantities].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user || !user.email) {
    return NextResponse.json(
      { error: "Sign in with an account that has an email before checkout." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const items = parseItems(
    body && typeof body === "object" && "items" in body
      ? body.items
      : undefined,
  );
  if (!items) {
    return NextResponse.json(
      { error: "Your cart is empty or contains invalid quantities." },
      { status: 400 },
    );
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((item) => item.productId) } },
  });
  if (products.length !== items.length) {
    return NextResponse.json(
      { error: "One or more products are no longer available." },
      { status: 409 },
    );
  }

  const quantityById = new Map(
    items.map((item) => [item.productId, item.quantity]),
  );
  for (const product of products) {
    const quantity = quantityById.get(product.id);
    if (!quantity || product.stockQuantity < quantity) {
      return NextResponse.json(
        { error: `${product.name} does not have enough stock.` },
        { status: 409 },
      );
    }
  }

  const totalAmount = products.reduce(
    (sum, product) =>
      sum.plus(product.price.mul(quantityById.get(product.id) ?? 0)),
    new Prisma.Decimal(0),
  );

  let stripe: ReturnType<typeof getStripeClient>;
  let checkoutBaseUrl: string;
  try {
    stripe = getStripeClient();
    checkoutBaseUrl = getAppUrl();
  } catch (error) {
    console.error("Stripe Checkout is not configured.", error);
    return NextResponse.json(
      { error: "Secure checkout is not configured." },
      { status: 500 },
    );
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      totalAmount,
      orderItems: {
        create: products.map((product) => ({
          productId: product.id,
          quantity: quantityById.get(product.id) ?? 0,
          priceAtPurchase: product.price,
        })),
      },
    },
  });

  try {
    const returnUrl =
      body &&
      typeof body === "object" &&
      "returnUrl" in body &&
      typeof (body as { returnUrl?: unknown }).returnUrl === "string"
        ? (body as { returnUrl: string }).returnUrl.trim()
        : undefined;

    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host?.includes("localhost") ? "http" : "https");
    const requestOrigin = host ? `${proto}://${host}` : checkoutBaseUrl;

    let successUrl: string;
    let cancelUrl: string;

    if (returnUrl) {
      const delimiter = returnUrl.includes("?") ? "&" : "?";
      successUrl = `${returnUrl}${delimiter}session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${returnUrl}${delimiter}canceled=1`;
    } else {
      successUrl = `${requestOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${requestOrigin}/checkout?canceled=1`;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id, userId: user.id },
      line_items: products.map((product) => ({
        quantity: quantityById.get(product.id) ?? 0,
        price_data: {
          currency: "usd",
          unit_amount: product.price.mul(100).toNumber(),
          product_data: {
            name: product.name,
            ...(product.description
              ? { description: product.description.slice(0, 500) }
              : {}),
          },
        },
      })),
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new Error("Stripe returned a checkout session without a URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Could not create Stripe Checkout session.", error);
    return NextResponse.json(
      {
        error:
          "Checkout could not be started. Please try again. If the problem continues, contact support before retrying.",
      },
      { status: 502 },
    );
  }
}
