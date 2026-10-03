import Link from "next/link";
import { AddToCartButton } from "@/components/add-to-cart-button";
import type { CartProduct } from "@/lib/cart/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ProductCard({ product }: { product: CartProduct }) {
  return (
    <article className="group overflow-hidden rounded-[1.4rem] border border-[#e3eae1] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(36,91,67,0.09)]">
      <Link
        href={`/products/${product.id}`}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#edf2ea]"
        aria-label={`View ${product.name}`}
      >
        {product.imageUrl ? (
          // Plain img supports product images hosted outside configured Next.js image domains.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_42%,#e2ecde_0,#edf2ea_60%,#e7eee3_100%)]">
            <span className="flex h-24 w-24 items-center justify-center rounded-full border border-[#d4e1d1] bg-white/50 font-serif text-5xl italic text-[#78957b] transition duration-500 group-hover:rotate-6 group-hover:scale-105">
              g
            </span>
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#52715a] backdrop-blur">
          Everyday essential
        </span>
      </Link>
      <div className="p-5 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/products/${product.id}`}
            className="text-[15px] font-semibold tracking-[-0.02em] text-[#244535] transition hover:text-[#4e775b]"
          >
            {product.name}
          </Link>
          <span className="shrink-0 text-sm font-semibold text-[#355c43]">
            {currency.format(product.price)}
          </span>
        </div>
        <p className="mt-2 text-xs text-[#849087]">
          {product.stockQuantity > 0
            ? `${product.stockQuantity} in stock`
            : "Out of stock"}
        </p>
        <div className="mt-4">
          {product.stockQuantity > 0 ? (
            <AddToCartButton product={product} />
          ) : (
            <button
              type="button"
              disabled
              className="w-full rounded-full bg-[#eef1ed] px-4 py-2.5 text-sm font-medium text-[#8a958c]"
            >
              Out of stock
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
