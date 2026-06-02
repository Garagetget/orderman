// User roles (T16). The role is stored in Supabase **app_metadata** (set from
// the dashboard / Auth admin API — a user can't change their own app_metadata),
// not user_metadata. A missing role means "owner" so the existing single owner
// account keeps full access without any dashboard change; only accounts
// explicitly tagged role:"staff" are restricted.

export type Role = "owner" | "staff";

/** Routes only the owner may open. Staff are redirected to /order. */
export const OWNER_ONLY_PREFIXES = ["/dashboard", "/menu"] as const;

export function roleFromMetadata(appMetadata: unknown): Role {
  const role = (appMetadata as { role?: unknown } | null | undefined)?.role;
  return role === "staff" ? "staff" : "owner";
}

export function isOwnerOnlyPath(pathname: string): boolean {
  return OWNER_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
