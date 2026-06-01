"use client";

import type { Menu } from "@/lib/database.types";
import { formatBaht } from "@/lib/format";

type MenuGridProps = {
  menus: Menu[];
  // Category display order (from the categories table); empty groups are skipped.
  categoryOrder: string[];
  onAdd: (menu: Menu, isSpecial?: boolean) => void;
};

export function MenuGrid({ menus, categoryOrder, onAdd }: MenuGridProps) {
  return (
    <div className="space-y-6">
      {categoryOrder.map((category) => {
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
                <div
                  key={menu.id}
                  className="flex overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/50"
                >
                  <button
                    type="button"
                    onClick={() => onAdd(menu)}
                    className="flex flex-1 flex-col items-start justify-center gap-1 p-3 text-left transition-colors hover:bg-primary/5 active:scale-[0.98]"
                  >
                    <span className="font-medium leading-tight">{menu.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatBaht(menu.price)}
                    </span>
                  </button>
                  {menu.special_surcharge != null && (
                    <button
                      type="button"
                      onClick={() => onAdd(menu, true)}
                      className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 self-stretch border-l bg-primary/5 px-1 text-center font-medium text-primary transition-colors hover:bg-primary/15 active:scale-[0.98]"
                    >
                      <span className="text-sm leading-none">พิเศษ</span>
                      <span className="text-xs leading-none opacity-80">
                        +{formatBaht(menu.special_surcharge)}
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
