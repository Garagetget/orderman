"use client";

import { UtensilsCrossed } from "lucide-react";

import { cartLineId } from "@/components/order-cart";
import type { Menu } from "@/lib/database.types";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";

type MenuGridProps = {
  menus: Menu[];
  // Category display order (from the categories table); empty groups are skipped.
  categoryOrder: string[];
  onAdd: (menu: Menu, isSpecial?: boolean) => void;
  // Cart-line ids currently in the cart — drives the selected card highlight.
  selectedIds?: Set<string>;
};

export function MenuGrid({
  menus,
  categoryOrder,
  onAdd,
  selectedIds,
}: MenuGridProps) {
  if (menus.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <UtensilsCrossed className="size-12 text-secondary opacity-50" />
        <p className="text-sm text-secondary">ยังไม่มีเมนูที่เปิดขาย</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {categoryOrder.map((category) => {
        const items = menus.filter((menu) => menu.category === category);
        if (items.length === 0) return null;

        return (
          <section key={category}>
            <div className="mb-3 mt-6 flex items-center gap-2 border-b border-border pb-2 first:mt-0">
              <span
                className="size-2 shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                {category}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((menu) => {
                const specialSelected =
                  menu.special_surcharge != null &&
                  (selectedIds?.has(cartLineId({ menu, isSpecial: true })) ??
                    false);
                const selected =
                  (selectedIds?.has(cartLineId({ menu, isSpecial: false })) ??
                    false) || specialSelected;

                return (
                <div
                  key={menu.id}
                  className={cn(
                    "flex overflow-hidden rounded-xl bg-surface transition-all duration-150",
                    selected
                      ? "border-2 border-primary bg-primary/5"
                      : "border border-border hover:border-primary/50 hover:shadow-sm",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onAdd(menu)}
                    className="flex flex-1 flex-col items-start justify-center gap-1 p-4 text-left transition-colors duration-150 hover:bg-primary/5 active:scale-[0.98]"
                  >
                    <span className="text-base font-medium leading-tight">
                      {menu.name}
                    </span>
                    <span className="text-sm tabular-nums text-secondary">
                      {formatBaht(menu.price)}
                    </span>
                  </button>
                  {menu.special_surcharge != null && (
                    <button
                      type="button"
                      onClick={() => onAdd(menu, true)}
                      className={cn(
                        "flex w-16 shrink-0 flex-col items-center justify-center gap-1 self-stretch border-l border-border px-1 text-center font-medium text-primary transition-colors duration-150 hover:bg-primary/15 active:scale-[0.98]",
                        specialSelected ? "bg-primary/15" : "bg-primary/5",
                      )}
                    >
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs leading-none text-primary">
                        พิเศษ
                      </span>
                      <span className="text-xs leading-none tabular-nums opacity-80">
                        +{formatBaht(menu.special_surcharge)}
                      </span>
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
