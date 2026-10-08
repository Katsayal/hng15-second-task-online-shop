import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CartItem } from "@/lib/cart/types";

async function getFormattedCartItems(userId: string): Promise<CartItem[]> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart) {
    return [];
  }

  return cart.items.map((item) => ({
    id: item.product.id,
    name: item.product.name,
    price: Number(item.product.price),
    imageUrl: item.product.imageUrl,
    stockQuantity: item.product.stockQuantity,
    quantity: item.quantity,
  }));
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }

  const items = await getFormattedCartItems(user.id);
  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  if (body && typeof body === "object" && "items" in body && Array.isArray((body as { items: unknown }).items)) {
    // Batch merge (e.g. migrating local storage items on login)
    const incomingItems = (body as { items: unknown[] }).items;
    for (const item of incomingItems) {
      if (
        !item ||
        typeof item !== "object" ||
        !("productId" in item) ||
        !("quantity" in item) ||
        typeof (item as { productId: unknown }).productId !== "string" ||
        typeof (item as { quantity: unknown }).quantity !== "number" ||
        (item as { quantity: number }).quantity < 1
      ) {
        continue;
      }

      const { productId, quantity } = item as { productId: string; quantity: number };
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product || product.stockQuantity < 1) continue;

      const existing = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      const combinedQuantity = (existing?.quantity ?? 0) + quantity;
      const finalQuantity = Math.min(combinedQuantity, product.stockQuantity);

      await prisma.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        create: {
          cartId: cart.id,
          productId,
          quantity: finalQuantity,
        },
        update: {
          quantity: finalQuantity,
        },
      });
    }
  } else if (
    body &&
    typeof body === "object" &&
    "productId" in body &&
    typeof (body as { productId: unknown }).productId === "string"
  ) {
    const { productId } = body as { productId: string; quantity?: unknown };
    const quantity =
      "quantity" in body && typeof body.quantity === "number"
        ? body.quantity
        : 1;

    if (quantity <= 0) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      });
    } else {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      if (product.stockQuantity < 1) {
        return NextResponse.json({ error: "Product out of stock" }, { status: 409 });
      }

      const mode = "mode" in body && typeof (body as { mode: unknown }).mode === "string" ? (body as { mode: string }).mode : "set";
      let finalQuantity: number;

      if (mode === "increment") {
        const existing = await prisma.cartItem.findUnique({
          where: { cartId_productId: { cartId: cart.id, productId } },
        });
        const currentQty = existing?.quantity ?? 0;
        finalQuantity = Math.min(currentQty + quantity, product.stockQuantity);
      } else {
        finalQuantity = Math.min(quantity, product.stockQuantity);
      }

      await prisma.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        create: {
          cartId: cart.id,
          productId,
          quantity: finalQuantity,
        },
        update: {
          quantity: finalQuantity,
        },
      });
    }
  } else {
    return NextResponse.json({ error: "Invalid cart payload" }, { status: 400 });
  }

  const items = await getFormattedCartItems(user.id);
  return NextResponse.json({ items });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
  if (cart) {
    if (productId) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      });
    } else {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }
  }

  const items = await getFormattedCartItems(user.id);
  return NextResponse.json({ items });
}
