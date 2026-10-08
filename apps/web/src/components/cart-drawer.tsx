"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCart } from "@/components/cart-provider";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function CartDrawer() {
  const {
    items,
    itemCount,
    total,
    isOpen,
    openCart,
    closeCart,
    setQuantity,
    removeItem,
    updatingItemId,
    cartError,
    clearCartError,
  } = useCart();

  return (
    <>
      <button
        type="button"
        onClick={openCart}
        className="rounded-full border border-[#d8e2d6] bg-white px-4 py-2 text-sm font-medium text-[#355c43] transition hover:border-[#abc3ab] hover:bg-[#eef4ec]"
        aria-label={`Open cart, ${itemCount} items`}
      >
        Cart ({itemCount})
      </button>
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
        <div className="fixed inset-0 z-50 flex h-dvh justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-[#183629]/35 backdrop-blur-[2px]"
            onClick={closeCart}
            aria-label="Close cart"
          />
          <aside
            className="relative flex h-dvh w-full max-w-md flex-col bg-[#fbfcfa] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            <div className="flex items-center justify-between border-b border-[#e3eae1] px-6 py-5">
              <div>
                <h2 id="cart-title" className="text-lg font-semibold text-[#244535]">
                  Your cart
                </h2>
                <p className="mt-1 text-sm text-[#849087]">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="rounded-full px-3 py-2 text-sm text-[#65766a] transition hover:bg-[#e9f1e8]"
                aria-label="Close cart"
              >
                Close
              </button>
            </div>
            {cartError && (
              <div
                role="alert"
                className="mx-6 mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#ffd2c9] bg-[#fff0ed] px-4 py-3 text-sm text-[#a44939]"
              >
                <span className="flex-1">{cartError}</span>
                <button
                  type="button"
                  onClick={clearCartError}
                  className="shrink-0 text-xs font-semibold uppercase tracking-wider text-[#a44939] underline underline-offset-2 hover:text-[#7d3224]"
                  aria-label="Dismiss cart error"
                >
                  Dismiss
                </button>
              </div>
            )}
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="text-[#52685a]">Your cart is empty.</p>
                <button
                  type="button"
                  onClick={closeCart}
                  className="mt-4 text-sm font-medium text-[#39704e] underline underline-offset-4"
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <ul className="min-h-0 flex-1 divide-y divide-[#e8ede6] overflow-y-auto px-6">
                  {items.map((item) => {
                    const isUpdating = updatingItemId === item.id;
                    return (
                      <li
                        key={item.id}
                        className={`py-5 transition-opacity ${isUpdating ? "opacity-60" : ""}`}
                      >
                        <div className="flex gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#e9f1e8]">
                            {item.imageUrl ? (
                              // Plain img supports product images hosted outside configured Next.js image domains.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="font-serif text-2xl italic text-[#78957b]">
                                g
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-[#244535]">
                                  {item.name}
                                </p>
                                <p className="mt-1 text-sm text-[#7b877e]">
                                  {currency.format(item.price)} each
                                </p>
                                <p className="mt-1 text-xs text-[#849087]">
                                  {item.stockQuantity} in stock
                                </p>
                              </div>
                              <p className="shrink-0 font-semibold text-[#355c43]">
                                {currency.format(item.price * item.quantity)}
                              </p>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setQuantity(item.id, item.quantity - 1)
                                }
                                disabled={isUpdating}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#cbdac9] bg-[#edf4ec] text-lg font-medium leading-none text-[#244535] transition hover:border-[#9fba9f] hover:bg-[#dfeadd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c9c75] disabled:cursor-wait disabled:opacity-40"
                                aria-label={`Decrease ${item.name} quantity`}
                              >
                                −
                              </button>
                              <span
                                className="min-w-7 text-center text-sm font-semibold text-[#244535]"
                                aria-live="polite"
                                aria-label={`Quantity ${item.quantity}`}
                              >
                                {isUpdating ? "…" : item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setQuantity(item.id, item.quantity + 1)
                                }
                                disabled={isUpdating || item.quantity >= item.stockQuantity}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#cbdac9] bg-[#edf4ec] text-lg font-medium leading-none text-[#244535] transition hover:border-[#9fba9f] hover:bg-[#dfeadd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c9c75] disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Increase ${item.name} quantity`}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                disabled={isUpdating}
                                className="ml-auto text-sm text-[#849087] underline underline-offset-4 hover:text-[#355c43] disabled:cursor-wait disabled:opacity-40"
                              >
                                {isUpdating ? "Updating…" : "Remove"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-[#e3eae1] bg-white px-6 py-5">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Subtotal</span>
                    <span>{currency.format(total)}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#849087]">
                    Shipping and taxes are calculated at checkout.
                  </p>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="mt-5 block rounded-full bg-[#245b43] px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-[#194531]"
                  >
                    Proceed to checkout
                  </Link>
                </div>
              </>
            )}
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
