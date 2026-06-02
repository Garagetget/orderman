// App-specific RBAC config for orderman. Kept separate from the generic guard
// (lib/rbac/guards.ts) so this file is the ONLY place to edit when porting the
// RBAC module to another project: change the permission catalog + route map.
//
// Permission keys MUST match the seed in supabase/migrations (T26) /
// supabase/rbac/rbac.sql exactly.

export const PERMISSIONS = {
  ORDER_CREATE: "order.create",
  ORDER_HISTORY_VIEW: "order.history.view",
  MENU_MANAGE: "menu.manage",
  DASHBOARD_VIEW: "dashboard.view",
  USER_MANAGE: "user.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Ordered path-prefix → required-permission map. Order matters: more-specific
 * prefixes come first so `/order-history` is matched before the shorter
 * `/order` prefix would shadow it.
 */
export const ROUTE_PERMISSIONS: ReadonlyArray<{
  prefix: string;
  permission: Permission;
}> = [
  { prefix: "/order-history", permission: PERMISSIONS.ORDER_HISTORY_VIEW },
  { prefix: "/order", permission: PERMISSIONS.ORDER_CREATE },
  { prefix: "/dashboard", permission: PERMISSIONS.DASHBOARD_VIEW },
  { prefix: "/menu", permission: PERMISSIONS.MENU_MANAGE },
  { prefix: "/admin", permission: PERMISSIONS.USER_MANAGE },
] as const;

/**
 * Resolve the permission a path requires, or null if the path is not gated by
 * RBAC (still subject to the logged-in check upstream). Matches exact path or
 * any sub-path of a prefix.
 */
export function requiredPermissionForPath(pathname: string): Permission | null {
  const match = ROUTE_PERMISSIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match?.permission ?? null;
}
