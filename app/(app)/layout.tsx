import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { getCurrentPermissions } from "@/lib/rbac/guards";
import { getUser } from "@/lib/supabase/server";

// Belt-and-suspenders: the proxy already gates these routes, but verifying the
// user here too means a server-render never leaks to a signed-out client.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // Resolve the user's permissions from the DB (T28) so the nav can hide links
  // the user can't reach. Same source of truth as the page/proxy guards.
  const permissions = await getCurrentPermissions();

  return (
    <div className="flex min-h-svh flex-col">
      <AppNav userEmail={user.email ?? ""} permissions={permissions} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
