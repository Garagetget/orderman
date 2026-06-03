import { cache } from "react";

import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Supabase client for Server Components, Server Actions and Route Handlers. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore because the
          // middleware refreshes the session cookie on every request.
        }
      },
    },
  });
}

/**
 * The authenticated user for the current request, or null. Wrapped in React
 * `cache()` so the layout, page guard and permission guards share ONE call to
 * Supabase Auth per request instead of each making its own network roundtrip
 * (getUser() validates the token against the Auth server every time). The cache
 * scope is a single RSC render / server-action invocation — exactly the window
 * where these guards stack up. The proxy runs in a separate (edge) runtime and
 * is not covered by this cache; it keeps its own getUser() call. (T32)
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
