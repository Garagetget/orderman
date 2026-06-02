import { redirect } from "next/navigation";

import { roleFromMetadata } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side owner gate (T16) for owner-only pages. The proxy already blocks
 * staff at the edge; this re-checks on render so a server component can never
 * leak owner-only data to a staff session. Redirects staff to /order.
 */
export async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (roleFromMetadata(user.app_metadata) !== "owner") redirect("/order");
}
