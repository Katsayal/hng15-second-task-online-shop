import Stripe from "stripe";
import { NextResponse, type NextRequest } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { sendOrderReceipt } from "@/lib/mailgun";
import { prisma } from "@/lib/prisma";

class OrderProcessingError extends Error {}

async function markOrderCancelled(orderId: string) {
  await prisma.order.updateMany({
    where: { id: orderId, status: "pending" },
    data: { status: "cancelled" },
  });
}

async function markOrderPaid(
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  const orderId = session.metadata?.orderId;
  const userId = session.metadata?.userId;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!orderId || !userId || !paymentIntentId) {
    throw new OrderProcessingError(
      "Paid Checkout Session is missing order, user, or payment intent metadata.",
    );
  }

  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order || order.userId !== userId) {
      throw new OrderProcessingError(
        `Checkout Session refers to an unknown order: ${orderId}`,
      );
    }

    if (order.status === "paid") {
      if (order.stripePaymentIntentId !== paymentIntentId) {
        throw new OrderProcessingError(
          `Order ${orderId} is already paid by a different payment intent.`,
        );
      }
      return false;
    }
    if (order.status !== "pending") {
      throw new OrderProcessingError(
        `Order ${orderId} cannot be paid from status ${order.status}.`,
      );
    }

    const expectedAmount = order.totalAmount.mul(100).toNumber();
    if (
      session.currency !== "usd" ||
      session.amount_total !== expectedAmount
    ) {
      throw new OrderProcessingError(
        `Paid Checkout Session amount does not match order ${orderId}.`,
      );
    }

    const claimedOrder = await transaction.order.updateMany({
      where: { id: orderId, status: "pending" },
      data: { status: "paid", stripePaymentIntentId: paymentIntentId },
    });

    if (claimedOrder.count === 0) {
      const currentOrder = await transaction.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });
      if (currentOrder?.status === "paid") return false;
      throw new OrderProcessingError(`Could not claim pending order ${orderId}.`);
    }

    for (const item of order.orderItems) {
      const updatedProduct = await transaction.product.updateMany({
        where: {
          id: item.productId,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (updatedProduct.count !== 1) {
        throw new OrderProcessingError(
          `Insufficient inventory to fulfill order ${orderId}, product ${item.productId}.`,
        );
      }
    }

    return true;
  }, {
    maxWait: 15_000,
    timeout: 30_000,
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook signature configuration is missing." },
      { status: 400 },
    );
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed.", error);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === "paid") {
          const wasJustPaid = await markOrderPaid(session);
          const orderId = session.metadata?.orderId;
          if (wasJustPaid && orderId) {
            try {
              await sendOrderReceipt(orderId);
            } catch (error) {
              console.error(
                `Order ${orderId} was paid, but its receipt could not be sent.`,
                error,
              );
            }
          }
        }
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await markOrderCancelled(orderId);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`Could not process Stripe event ${event.id}.`, error);
    return NextResponse.json(
      { error: "Could not process Stripe event." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
