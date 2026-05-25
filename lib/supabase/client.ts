import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Supabase client for use in Client Components. */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
