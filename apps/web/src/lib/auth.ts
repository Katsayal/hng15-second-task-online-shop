import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function getSafeRedirectPath(path: string | null): string {
  if (
    !path ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  ) {
    return "/";
  }

  return path;
}

export async function getAuthenticatedUser(
  request?: Request,
): Promise<User | null> {
  let user: User | null = null;

  // 1. Check Bearer token in Authorization header (Mobile client)
  const authHeader = request?.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        user = data.user;
      }
    }
  }

  // 2. Fall back to Supabase cookie session (Web client)
  if (!user) {
    try {
      const serverSupabase = await createSupabaseServerClient({
        readOnly: true,
      });
      const { data, error } = await serverSupabase.auth.getUser();
      if (!error && data.user) {
        user = data.user;
      }
    } catch {
      // Cookies not accessible or error reading request context
    }
  }

  if (!user || !user.email) {
    return null;
  }

  // 3. JIT upsert user in Neon database to ensure foreign key integrity
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email, fullName },
    update: { email: user.email, fullName },
  });

  return user;
}
