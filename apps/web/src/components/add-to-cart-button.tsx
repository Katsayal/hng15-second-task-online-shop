"use client";

import { useCart } from "@/components/cart-provider";
import type { CartProduct } from "@/lib/cart/types";

export function AddToCartButton({
  product,
  quantity = 1,
}: {
  product: CartProduct;
  quantity?: number;
}) {
  const { addItem, updatingItemId } = useCart();
  const isUpdating = updatingItemId === product.id;

  return (
    <button
      type="button"
      onClick={() => addItem(product, quantity)}
      disabled={isUpdating || product.stockQuantity < 1}
      className="w-full rounded-full bg-[#245b43] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#194531] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c9c75] disabled:cursor-wait disabled:opacity-60"
    >
      {isUpdating ? "Adding…" : "Add to cart"}
    </button>
  );
}
