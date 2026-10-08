import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { CartDrawer } from "@/components/cart-drawer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient({ readOnly: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const compactName =
    typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name.split(" ")[0]
      : user?.email?.split("@")[0] || "Account";

  const fullEmail = user?.email || compactName;

  return (
    <header className="sticky top-0 z-30 border-b border-[#e5ebe2]/90 bg-[#f7f9f5]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-3.5 sm:gap-4 sm:px-8 sm:py-4 lg:px-10">
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#245b43] text-sm font-semibold text-white transition group-hover:bg-[#194531] sm:h-9 sm:w-9">
            g
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.03em] text-[#244535] sm:text-[15px]">
            goodthings<span className="text-[#83a087]">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-6">
          <Link
            href="/#shop"
            className="hidden text-sm text-[#65766a] transition hover:text-[#245b43] sm:inline"
          >
            Shop
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3.5">
            {user ? (
              <>
                <div
                  className="flex items-center gap-1 rounded-full bg-[#edf2ea] px-2 py-1 text-xs text-[#244535] sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm"
                  title={user.email}
                >
                  <span aria-hidden="true" className="text-[11px] sm:text-xs">
                    👤
                  </span>
                  <span className="max-w-[76px] truncate font-medium sm:hidden">
                    {compactName}
                  </span>
                  <span className="hidden max-w-48 truncate font-medium text-[#728076] sm:inline lg:max-w-64">
                    {fullEmail}
                  </span>
                </div>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="text-xs text-[#65766a] transition hover:text-[#245b43] sm:text-sm"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="text-xs font-medium text-[#52685a] transition hover:text-[#245b43] sm:text-sm"
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
