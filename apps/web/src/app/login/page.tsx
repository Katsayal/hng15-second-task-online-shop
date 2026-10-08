import { signInWithEmail, signInWithGoogle } from "@/app/actions/auth";
import Link from "next/link";

const authErrors: Record<string, string> = {
  oauth_start_failed: "Unable to start Google sign-in. Please try again.",
  missing_auth_code: "The sign-in link was incomplete. Please try again.",
  auth_callback_failed: "Google sign-in could not be completed. Please try again.",
  email_required: "Please provide a valid email and password.",
  invalid_credentials: "Invalid email or password.",
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
          Sign in with your email or Google account to access your synchronized cart and checkout.
        </p>
        {error && (
          <p
            className="mt-5 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#a44939]"
            role="alert"
          >
            {authErrors[error] ?? decodeURIComponent(error)}
          </p>
        )}

        <form action={signInWithEmail} className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="next" value={next ?? "/"} />
          <div>
            <label className="block text-xs font-medium text-[#4b5952] mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#d6dfd4] px-4 py-2.5 text-sm text-[#193a2c] outline-none focus:border-[#245b43]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4b5952] mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-[#d6dfd4] px-4 py-2.5 text-sm text-[#193a2c] outline-none focus:border-[#245b43]"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-full bg-[#245b43] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#194531]"
          >
            Sign In / Sign Up with Email
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e3eae1]" />
          <span className="text-xs uppercase text-[#88968d]">or</span>
          <div className="h-px flex-1 bg-[#e3eae1]" />
        </div>

        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next ?? "/"} />
          <button
            type="submit"
            className="w-full rounded-full border border-[#d6dfd4] bg-white px-5 py-3 text-sm font-medium text-[#193a2c] transition hover:bg-[#f7f9f5]"
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
