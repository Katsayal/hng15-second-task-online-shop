"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import type { CartProduct } from "@/lib/cart/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ProductDetail({
  product,
}: {
  product: CartProduct & { description: string | null };
}) {
  const [quantity, setQuantity] = useState(1);
  const inStock = product.stockQuantity > 0;

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[2rem] bg-[#e9f1e8]">
        {product.imageUrl ? (
          // Plain img supports product images hosted outside configured Next.js image domains.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-32 w-32 items-center justify-center rounded-full border border-[#d4e1d1] bg-white/50 font-serif text-6xl italic text-[#78957b]">
            g
          </span>
        )}
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a806f]">
          The collection
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em] text-[#193a2c] sm:text-4xl">
          {product.name}
        </h1>
        <p className="mt-4 text-2xl font-medium text-[#355c43]">
          {currency.format(product.price)}
        </p>
        <p className="mt-6 whitespace-pre-wrap leading-7 text-[#718077]">
          {product.description || "No description is available for this item."}
        </p>
        <p className="mt-5 flex items-center gap-2 text-sm text-[#718077]">
          <span className={`h-2 w-2 rounded-full ${inStock ? "bg-[#6e9c72]" : "bg-[#b5bbb5]"}`} />
          {inStock ? `${product.stockQuantity} in stock` : "Out of stock"}
        </p>
        {inStock && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label htmlFor="quantity" className="text-sm font-medium">
              Quantity
            </label>
            <div className="flex items-center rounded-full border border-[#d8e2d6] bg-white">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="h-10 w-10"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                id="quantity"
                type="number"
                min={1}
                max={product.stockQuantity}
                value={quantity}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setQuantity(
                    Number.isFinite(value)
                      ? Math.min(product.stockQuantity, Math.max(1, value))
                      : 1,
                  );
                }}
                className="h-10 w-14 border-x border-[#e3eae1] bg-transparent text-center text-sm text-[#244535] outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setQuantity((value) =>
                    Math.min(product.stockQuantity, value + 1),
                  )
                }
                className="h-10 w-10"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <AddToCartButton product={product} quantity={quantity} />
          </div>
        )}
      </div>
    </div>
  );
}
