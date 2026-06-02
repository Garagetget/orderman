// Centralised env access so a missing value fails loudly with a clear message
// instead of a cryptic "supabaseUrl is required" deep inside the SDK.
// Resolved lazily (not at import time) so `next build` doesn't fail before
// .env.local exists.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export function getSupabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

// Server-only secret. Kept as a separate lazy getter (NOT part of
// getSupabaseEnv) so `next build` and the normal anon-key data path never
// require it — it's only resolved when an admin action actually calls it.
// Never expose via a NEXT_PUBLIC_* var: the service_role key bypasses RLS.
export function getServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY");
}
