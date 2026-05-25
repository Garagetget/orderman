"use client";

import { useMemo, useState, useTransition } from "react";

import { toast } from "sonner";

import { createOrder } from "@/app/(app)/order/actions";
import { MenuGrid } from "@/components/menu-grid";
import { OrderCart, type CartLine } from "@/components/order-cart";
import type { Menu } from "@/lib/database.types";
import { formatBaht } from "@/lib/format";

export function OrderTaker({ menus }: { menus: Menu[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [saving, startSaving] = useTransition();

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.menu.price * line.quantity, 0),
    [cart],
  );

  function addItem(menu: Menu) {
    setCart((prev) => {
      const existing = prev.find((line) => line.menu.id === menu.id);
      if (existing) {
        return prev.map((line) =>
          line.menu.id === menu.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...prev, { menu, quantity: 1 }];
    });
  }

  function changeQuantity(menuId: string, quantity: number) {
    setCart((prev) =>
      quantity < 1
        ? prev.filter((line) => line.menu.id !== menuId)
        : prev.map((line) =>
            line.menu.id === menuId ? { ...line, quantity } : line,
          ),
    );
  }

  function clearCart() {
    setCart([]);
    setNote("");
  }

  function handleSave() {
    if (cart.length === 0) return;

    const items = cart.map((line) => ({
      menu_id: line.menu.id,
      quantity: line.quantity,
    }));
    const savedTotal = total;

    startSaving(async () => {
      const result = await createOrder(items, note);
      if (result.ok) {
        toast.success("บันทึกออเดอร์เรียบร้อย", {
          description: `ยอดรวม ${formatBaht(savedTotal)}`,
        });
        clearCart();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <MenuGrid menus={menus} onAdd={addItem} />
      <div className="lg:sticky lg:top-20 lg:self-start">
        <OrderCart
          lines={cart}
          total={total}
          note={note}
          saving={saving}
          onNoteChange={setNote}
          onChangeQuantity={changeQuantity}
          onClear={clearCart}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
