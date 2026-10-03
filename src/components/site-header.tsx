import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { CartDrawer } from "@/components/cart-drawer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient({ readOnly: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-[#e5ebe2]/90 bg-[#f7f9f5]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#245b43] text-sm font-semibold text-white transition group-hover:bg-[#194531]">
            g
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.03em] text-[#244535]">
            goodthings<span className="text-[#83a087]">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/#shop"
            className="hidden text-sm text-[#65766a] transition hover:text-[#245b43] sm:inline"
          >
            Shop
          </Link>
          <nav className="flex items-center gap-2.5 sm:gap-4">
          {user ? (
            <>
              <span className="hidden max-w-52 truncate text-sm text-[#728076] lg:inline">
                {user.email}
              </span>
              <form action={signOut}>
                <button className="text-sm text-[#65766a] transition hover:text-[#245b43]">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-[#52685a] transition hover:text-[#245b43]"
            >
              Sign in
            </Link>
          )}
          <CartDrawer />
          </nav>
        </div>
      </div>
    </header>
  );
}
