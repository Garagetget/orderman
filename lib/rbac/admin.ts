// server-only: importing this module from a client component fails the build,
// so the service_role key can never be bundled for the browser.
import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { getServiceRoleKey, getSupabaseEnv } from "@/lib/supabase/env";

// WARNING: this client uses the service_role key and BYPASSES Row Level Security.
// Only call it from server actions that have already verified the caller's
// permission (e.g. user.manage) — never from a data path that trusts RLS.
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  return createClient<Database>(url, getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
