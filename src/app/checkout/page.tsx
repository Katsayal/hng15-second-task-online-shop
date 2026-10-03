import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";

type CheckoutPageProps = {
  searchParams: Promise<{ canceled?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { canceled } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-8">
      <Link href="/" className="text-sm text-[#718077] transition hover:text-[#245b43]">
        ← Continue shopping
      </Link>
      <h1 className="mt-6 text-3xl font-medium tracking-[-0.04em] text-[#193a2c]">
        Secure checkout
      </h1>
      {canceled === "1" && (
        <p className="mt-4 rounded-xl bg-[#f6f2df] p-4 text-sm text-[#746936]">
          Checkout was canceled. Your cart is still saved.
        </p>
      )}
      <div className="mt-8">
        <CheckoutForm />
      </div>
    </main>
  );
}
