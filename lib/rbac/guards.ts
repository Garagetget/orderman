import { cache } from "react";

import { redirect } from "next/navigation";

import { createClient, getUser } from "@/lib/supabase/server";

// The RBAC helper RPCs (auth_has_permission / auth_user_permissions) were added
// by the T26 migration but lib/database.types.ts has not been regenerated (no
// Docker in this env to run `supabase db dump`). Until it is, these names aren't
// in the generated Database type, so each rpc() call is made through a narrow
// `as never`/cast at the call site. Keep the casts localized — do not loosen the
// whole client. Remove them once the types are regenerated.

/**
 * All permission keys for the current user (empty when signed out or on error).
 * Used by the layout to decide which nav links to render, and the single source
 * for every permission check below. Wrapped in React `cache()` so layout + page
 * guard + every hasPermission() call in one request resolve permissions with a
 * single DB roundtrip (the full list), instead of one auth_has_permission RPC
 * per check plus a redundant getUser each. (T32)
 */
export const getCurrentPermissions = cache(async (): Promise<string[]> => {
  if (!(await getUser())) return [];

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("auth_user_permissions");
  if (error || !Array.isArray(data)) return [];
  return data as string[];
});

/**
 * Boolean permission check for use inside server actions (does NOT redirect).
 * Returns false when signed out or on error. Reads from the request-cached
 * permission list so repeated checks in one action cost no extra roundtrip.
 */
export async function hasPermission(perm: string): Promise<boolean> {
  return (await getCurrentPermissions()).includes(perm);
}

/**
 * Server-side gate for RBAC-protected RSC pages. Redirects to /login when
 * signed out, or to /order (the lowest common landing page) when the user lacks
 * the permission. Defense-in-depth on top of the proxy edge gate so a server
 * render never leaks protected data even if the proxy is bypassed.
 */
export async function requirePermission(perm: string): Promise<void> {
  if (!(await getUser())) redirect("/login");

  if (!(await hasPermission(perm))) redirect("/order");
}
