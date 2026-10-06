import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSafeRedirectPath } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get("next"),
  );

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_auth_code", request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", request.url),
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.redirect(
      new URL("/login?error=email_required", request.url),
    );
  }

  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email, fullName },
    update: { email: user.email, fullName },
  });

  return NextResponse.redirect(new URL(nextPath, request.url));
}
