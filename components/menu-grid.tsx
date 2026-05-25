"use client";

import type { Menu, MenuCategory } from "@/lib/database.types";
import { formatBaht } from "@/lib/format";

// Render order for the two fixed categories.
const CATEGORY_ORDER: MenuCategory[] = ["อาหาร", "เครื่องดื่ม"];

type MenuGridProps = {
  menus: Menu[];
  onAdd: (menu: Menu) => void;
};

export function MenuGrid({ menus, onAdd }: MenuGridProps) {
  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map((category) => {
        const items = menus.filter((menu) => menu.category === category);
        if (items.length === 0) return null;

        return (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              {category}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => onAdd(menu)}
                  className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent active:scale-[0.98]"
                >
                  <span className="font-medium leading-tight">{menu.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatBaht(menu.price)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
