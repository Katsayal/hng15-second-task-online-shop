"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export function CheckoutForm() {
  const { items, total } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function startCheckout() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ id, quantity }) => ({
            productId: id,
            quantity,
          })),
        }),
      });
      const result: unknown = await response.json();

      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("url" in result) ||
        typeof result.url !== "string"
      ) {
        const message =
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Checkout could not be started. Please try again.";
        throw new Error(message);
      }

      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout could not be started. Please try again.",
      );
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-[#e3eae1] bg-white p-7 text-center">
        <p className="text-[#52685a]">Your cart is empty.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-[#39704e] underline underline-offset-4"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#e3eae1] bg-white p-6 sm:p-8">
      <ul className="divide-y divide-[#e8ede6]">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-4 first:pt-0">
            <span className="text-sm text-[#52685a]">
              {item.name} <span className="text-[#849087]">× {item.quantity}</span>
            </span>
            <span className="shrink-0 text-sm font-medium">
              {(item.price * item.quantity).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-between border-t border-[#e3eae1] pt-4 font-semibold text-[#244535]">
        <span>Subtotal</span>
        <span>
          {total.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#849087]">
        Final prices and stock are checked against the database before payment.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#fff0ed] p-3 text-sm text-[#a44939]">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={startCheckout}
        disabled={isSubmitting}
        className="mt-5 w-full rounded-full bg-[#245b43] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#194531] disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Redirecting to secure checkout…" : "Pay securely with Stripe"}
      </button>
    </div>
  );
}
