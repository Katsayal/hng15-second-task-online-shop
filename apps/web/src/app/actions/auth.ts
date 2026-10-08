"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSafeRedirectPath } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function signInWithEmail(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim();
  const nextValue = formData.get("next");
  const nextPath = getSafeRedirectPath(
    typeof nextValue === "string" ? nextValue : null,
  );

  if (!email || !password) {
    redirect("/login?error=email_required");
  }

  const supabase = await createSupabaseServerClient();
  let authenticatedUser = null;

  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInResult.error && signInResult.data.user) {
    authenticatedUser = signInResult.data.user;
  } else {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (serviceRoleKey && supabaseUrl) {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      const retry = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (retry.error || !retry.data.user) {
        redirect(
          `/login?error=${encodeURIComponent(retry.error?.message ?? "Authentication failed")}`,
        );
      }
      authenticatedUser = retry.data.user;
    } else {
      const signUpResult = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpResult.error || !signUpResult.data.user) {
        redirect(
          `/login?error=${encodeURIComponent(signUpResult.error?.message ?? "Sign up failed")}`,
        );
      }
      authenticatedUser = signUpResult.data.user;
    }
  }

  if (authenticatedUser) {
    await prisma.user.upsert({
      where: { id: authenticatedUser.id },
      create: {
        id: authenticatedUser.id,
        email: authenticatedUser.email!,
        fullName: authenticatedUser.email!.split("@")[0],
      },
      update: { email: authenticatedUser.email! },
    });
  }

  redirect(nextPath);
}

export async function signInWithGoogle(formData: FormData) {
  const nextValue = formData.get("next");
  const nextPath = getSafeRedirectPath(
    typeof nextValue === "string" ? nextValue : null,
  );

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto =
    headerList.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");
  const origin =
    headerList.get("origin") || (host ? `${proto}://${host}` : null);
  const appUrl = origin || process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL");
  }

  const callbackUrl = new URL("/auth/callback", appUrl);
  if (nextPath && nextPath !== "/") {
    callbackUrl.searchParams.set("next", nextPath);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_start_failed");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  redirect("/");
}
