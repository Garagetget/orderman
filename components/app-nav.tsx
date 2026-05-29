"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ClipboardList, History, LayoutDashboard, LogOut } from "lucide-react";

import { signOut } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";

const LINKS = [
  { href: "/order", label: "จดออเดอร์", icon: ClipboardList },
  { href: "/order-history", label: "ประวัติ", icon: History },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

export function AppNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-1 px-4">
        <span className="mr-3 text-lg font-bold text-primary sm:mr-5">orderman</span>

        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={buttonVariants({
                  variant: active ? "secondary" : "ghost",
                  size: "sm",
                })}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline">
            {userEmail}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
