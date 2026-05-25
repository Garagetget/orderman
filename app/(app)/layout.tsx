import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";

// Belt-and-suspenders: middleware already gates these routes, but verifying
// the user here too means a server-render never leaks to a signed-out client.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <AppNav userEmail={user.email ?? ""} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
