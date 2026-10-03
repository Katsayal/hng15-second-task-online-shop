import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import type { CartProduct } from "@/lib/cart/types";

export default async function Home() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  const cartProducts: CartProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: Number(product.price),
    imageUrl: product.imageUrl,
    stockQuantity: product.stockQuantity,
  }));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-20 pt-7 sm:px-8 lg:px-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#e8f0e5] px-7 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
        <div className="absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full border border-[#cbdcc9] sm:right-12 sm:top-[-8rem] sm:h-[27rem] sm:w-[27rem]" />
        <div className="absolute right-8 top-16 -z-10 h-48 w-48 rounded-full bg-[#d9e8d5] sm:right-40 sm:top-20 sm:h-72 sm:w-72" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c6d9c5] bg-white/60 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-[#41664f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5b8b64]" />
            Considered goods, everyday
          </span>
          <h1 className="mt-7 max-w-xl text-4xl font-medium leading-[1.08] tracking-[-0.045em] text-[#193a2c] sm:text-6xl">
            A little more
            <br />
            <span className="font-serif italic text-[#4e775b]">good</span> in
            your day.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#607366] sm:text-lg">
            Thoughtful essentials, chosen to make everyday living feel a little
            better.
          </p>
          <Link
            href="#shop"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#245b43] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#194531]"
          >
            Explore the collection
            <span aria-hidden="true">↓</span>
          </Link>
        </div>
        <div className="absolute bottom-8 right-10 hidden max-w-48 text-right text-xs leading-5 text-[#718477] lg:block">
          Simple things.
          <br />
          Made to be enjoyed.
        </div>
      </section>

      <section id="shop" className="scroll-mt-8 pt-16 sm:pt-20">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:mb-9 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a806f]">
              The collection
            </p>
            <h2 className="mt-2 text-3xl font-medium tracking-[-0.035em] text-[#193a2c] sm:text-4xl">
              Made for your everyday
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[#718077]">
            Useful, well-made favorites for a calmer, more considered routine.
          </p>
        </div>
        {cartProducts.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cartProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <section className="rounded-3xl border border-dashed border-[#ccd9cc] bg-white/70 px-6 py-16 text-center sm:py-20">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e9f1e8] text-xl text-[#4c7555]">
              ✳
            </span>
            <h3 className="mt-5 text-xl font-medium tracking-tight text-[#244535]">
              Something good is on its way
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718077]">
              We’re getting the collection ready. Check back soon to discover
              our everyday essentials.
            </p>
          </section>
        )}
      </section>

      <section className="mt-16 grid gap-4 rounded-3xl border border-[#e2e9df] bg-white p-6 sm:mt-20 sm:grid-cols-3 sm:gap-8 sm:p-8">
        {[
          ["01", "Thoughtfully chosen", "Only the things we’d love to keep."],
          ["02", "Easy by design", "Simple shopping, no extra fuss."],
          ["03", "Made for everyday", "Good things you’ll reach for often."],
        ].map(([number, title, description]) => (
          <div key={number} className="flex gap-4">
            <span className="pt-0.5 text-xs font-semibold tracking-wide text-[#86a18b]">
              {number}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[#244535]">{title}</h3>
              <p className="mt-1 text-sm leading-5 text-[#78857b]">
                {description}
              </p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
