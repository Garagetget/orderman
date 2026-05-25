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
