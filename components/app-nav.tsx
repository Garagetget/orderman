"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  UtensilsCrossed,
} from "lucide-react";

import { signOut } from "@/app/auth/actions";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/order", label: "จดออเดอร์", icon: ClipboardList, ownerOnly: false },
  { href: "/order-history", label: "ประวัติ", icon: History, ownerOnly: false },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ownerOnly: true },
  { href: "/menu", label: "จัดการเมนู", icon: UtensilsCrossed, ownerOnly: true },
] as const;

export function AppNav({
  userEmail,
  role,
}: {
  userEmail: string;
  role: Role;
}) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => role === "owner" || !link.ownerOnly);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface shadow-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-1 px-4 md:px-6 lg:px-8">
        <Link
          href="/order"
          className="mr-2 text-xl font-bold text-primary sm:mr-5"
        >
          orderman
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-14 items-center gap-1.5 border-b-2 px-2 text-sm font-medium transition-colors focus-visible:text-primary focus-visible:outline-none sm:px-3",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-secondary hover:text-primary",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden text-xs text-secondary md:inline">
            {userEmail}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-secondary transition-all hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
