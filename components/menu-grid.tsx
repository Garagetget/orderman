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
            <div className="mb-3 flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold">{category}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => onAdd(menu)}
                  className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
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
