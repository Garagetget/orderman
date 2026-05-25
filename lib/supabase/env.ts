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
