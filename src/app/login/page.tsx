import { signInWithGoogle } from "@/app/actions/auth";
import Link from "next/link";

const authErrors: Record<string, string> = {
  oauth_start_failed: "Unable to start Google sign-in. Please try again.",
  missing_auth_code: "The sign-in link was incomplete. Please try again.",
  auth_callback_failed: "Google sign-in could not be completed. Please try again.",
  email_required: "Google did not provide an email address for this account.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <section className="w-full max-w-md rounded-[2rem] border border-[#e3eae1] bg-white p-8 shadow-[0_20px_70px_rgba(36,91,67,0.07)] sm:p-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#244535]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#245b43] text-white">g</span>
          goodthings.
        </Link>
        <h1 className="mt-8 text-3xl font-medium tracking-[-0.04em] text-[#193a2c]">
          Sign in to continue
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#718077]">
          Use your Google account to access checkout and your orders.
        </p>
        {error && (
          <p
            className="mt-5 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#a44939]"
            role="alert"
          >
            {authErrors[error] ?? "Sign-in failed. Please try again."}
          </p>
        )}
        <form action={signInWithGoogle} className="mt-8">
          <input type="hidden" name="next" value={next ?? "/"} />
          <button
            type="submit"
            className="w-full rounded-full bg-[#245b43] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#194531]"
          >
            Continue with Google
          </button>
        </form>
        <Link
          href="/"
          className="mt-6 block text-center text-sm text-[#7b877e] hover:text-[#245b43]"
        >
          Back to shop
        </Link>
      </section>
    </main>
  );
}
