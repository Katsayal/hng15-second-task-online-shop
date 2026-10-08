import Link from "next/link";
import { ClearCartOnSuccess } from "@/components/clear-cart-on-success";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ session_id?: string; source?: string }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const { session_id: sessionId, source } = await searchParams;
  const supabase = await createSupabaseServerClient({ readOnly: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let paid = false;
  if (sessionId) {
    try {
      const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        if (!user || session.metadata?.userId === user.id) {
          paid = true;
          if (session.metadata?.userId) {
            await prisma.cartItem.deleteMany({
              where: { cart: { userId: session.metadata.userId } },
            }).catch(() => {});
          }
        }
      }
    } catch (error) {
      console.error("Could not verify Stripe Checkout success session.", error);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      {paid && <ClearCartOnSuccess />}
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e5f0e2] text-2xl text-[#39704e]">
        {paid ? "✓" : "!"}
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a806f]">
        goodthings.
      </p>
      <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em] text-[#193a2c]">
        {paid ? "Thank you for your order" : "We could not verify this payment"}
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-6 text-[#718077]">
        {paid
          ? "Your payment was successful. Your order is being confirmed."
          : "Please return to the shop and check your Stripe receipt, or try checkout again."}
      </p>
      {source === "mobile" ? (
        <p className="mt-7 text-sm font-semibold text-[#245b43]">
          ✓ Please return to your mobile app
        </p>
      ) : (
        <Link
          href="/"
          className="mt-7 rounded-full bg-[#245b43] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#194531]"
        >
          Return to shop
        </Link>
      )}
    </main>
  );
}
