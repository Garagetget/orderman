import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { isOwnerOnlyPath, roleFromMetadata } from "@/lib/roles";
import { getSupabaseEnv } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/login"];

/**
 * Refreshes the Supabase session cookie on every request and enforces the
 * auth gate: signed-out users are sent to /login, signed-in users are kept
 * away from /login.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() must be called right after creating the client so the
  // session cookie is refreshed. Do not run code between these two lines.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/order";
    return NextResponse.redirect(redirectUrl);
  }

  // Role gate (T16): staff may only reach the order pages. Owner-only routes
  // (dashboard, menu management) bounce staff back to /order.
  if (
    user &&
    isOwnerOnlyPath(pathname) &&
    roleFromMetadata(user.app_metadata) !== "owner"
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/order";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
