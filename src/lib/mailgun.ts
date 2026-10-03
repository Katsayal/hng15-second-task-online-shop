import FormData from "form-data";
import Mailgun from "mailgun.js";
import { prisma } from "@/lib/prisma";

let mailgunClient: ReturnType<Mailgun["client"]> | undefined;

function getMailgunClient() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const baseUrl = process.env.MAILGUN_BASE_URL;

  if (!apiKey || !baseUrl) {
    throw new Error("Missing MAILGUN_API_KEY or MAILGUN_BASE_URL");
  }

  if (!mailgunClient) {
    mailgunClient = new Mailgun(FormData).client({
      username: "api",
      key: apiKey,
      url: baseUrl,
    });
  }

  return mailgunClient;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendOrderReceipt(orderId: string) {
  const domain = process.env.MAILGUN_DOMAIN;
  if (!domain) {
    throw new Error("Missing MAILGUN_DOMAIN");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      orderItems: {
        include: { product: true },
      },
    },
  });

  if (!order || order.status !== "paid") {
    throw new Error(`Cannot send receipt for unpaid or missing order ${orderId}`);
  }

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const rows = order.orderItems.map((item) => {
    const name = escapeHtml(item.product.name);
    const quantity = item.quantity;
    const subtotal = Number(item.priceAtPurchase) * quantity;
    return {
      text: `${item.product.name} x ${quantity}: ${formatAmount(subtotal)}`,
      html: `<tr><td style="padding:8px 12px">${name} × ${quantity}</td><td style="padding:8px 12px;text-align:right">${formatAmount(subtotal)}</td></tr>`,
    };
  });

  const total = formatAmount(Number(order.totalAmount));
  const safeOrderId = escapeHtml(order.id);
  const text = [
    `Thank you for your order, ${order.user.fullName ?? order.user.email}.`,
    "",
    ...rows.map((row) => row.text),
    "",
    `Total: ${total}`,
    `Order: ${order.id}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;color:#18181b;max-width:600px;margin:auto"><h1>Thank you for your order</h1><p>We’ve received your payment and are preparing your order.</p><table style="width:100%;border-collapse:collapse"><tbody>${rows.map((row) => row.html).join("")}</tbody></table><p style="text-align:right;font-size:18px"><strong>Total: ${total}</strong></p><p style="color:#71717a">Order ${safeOrderId}</p></div>`;

  await getMailgunClient().messages.create(domain, {
    from: `HNG Shop <postmaster@${domain}>`,
    to: [order.user.email],
    subject: `Receipt for order ${order.id}`,
    text,
    html,
  });
}
