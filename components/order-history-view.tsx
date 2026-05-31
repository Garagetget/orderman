"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Minus, Pencil, Plus, X } from "lucide-react";

import { toast } from "sonner";

import { cancelOrder, updateOrderItems } from "@/app/(app)/order-history/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order, OrderItem } from "@/lib/database.types";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";

export type OrderWithItems = Order & {
  order_items: (Omit<OrderItem, "menu_id"> & {
    menus: { name: string } | null;
  })[];
};

type Mode = "view" | "edit" | "confirmCancel";

function formatBangkokDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function OrderHistoryView({ orders }: { orders: OrderWithItems[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  // Draft quantities while editing, keyed by order_item id.
  const [draftQty, setDraftQty] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();

  if (orders.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        ยังไม่มีออเดอร์
      </p>
    );
  }

  function toggleOpen(orderId: string) {
    setMode("view");
    setOpenId((prev) => (prev === orderId ? null : orderId));
  }

  function startEdit(order: OrderWithItems) {
    setDraftQty(
      Object.fromEntries(order.order_items.map((it) => [it.id, it.quantity])),
    );
    setMode("edit");
  }

  function changeDraft(itemId: string, next: number) {
    if (next < 1) return; // removing items is out of scope — keep at least 1
    setDraftQty((prev) => ({ ...prev, [itemId]: next }));
  }

  function handleSave(order: OrderWithItems) {
    const items = order.order_items.map((it) => ({
      item_id: it.id,
      quantity: draftQty[it.id] ?? it.quantity,
    }));
    const unchanged = items.every(
      (it, i) => it.quantity === order.order_items[i].quantity,
    );
    if (unchanged) {
      setMode("view");
      return;
    }

    startTransition(async () => {
      const result = await updateOrderItems(order.id, items);
      if (result.ok) {
        toast.success("แก้ไขออเดอร์เรียบร้อย");
        setMode("view");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCancel(order: OrderWithItems) {
    startTransition(async () => {
      const result = await cancelOrder(order.id);
      if (result.ok) {
        toast.success("ยกเลิกออเดอร์เรียบร้อย");
        setMode("view");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const isOpen = openId === order.id;
        const isCancelled = order.status === "cancelled";
        const isEditing = isOpen && mode === "edit";

        const draftTotal = order.order_items.reduce(
          (sum, it) => sum + it.price * (draftQty[it.id] ?? it.quantity),
          0,
        );

        return (
          <div
            key={order.id}
            className={cn(
              "overflow-hidden rounded-lg border bg-card",
              isCancelled && "opacity-50",
            )}
          >
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
              onClick={() => toggleOpen(order.id)}
            >
              {isOpen ? (
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                #{order.id.slice(0, 8)}
              </span>
              <span className="flex-1 text-sm">
                {formatBangkokDateTime(order.created_at)}
              </span>
              <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
                {order.order_items.length} รายการ
              </span>
              <span className="w-24 shrink-0 text-right text-sm font-medium">
                {formatBaht(order.total)}
              </span>
              <Badge
                variant={isCancelled ? "destructive" : "secondary"}
                className="hidden w-14 justify-center sm:flex"
              >
                {isCancelled ? "ยกเลิก" : "สำเร็จ"}
              </Badge>
            </button>

            {isOpen && (
              <div className="border-t px-4 py-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">รายการ</th>
                      <th className="pb-2 text-right font-medium">จำนวน</th>
                      <th className="pb-2 text-right font-medium">ราคา/ชิ้น</th>
                      <th className="pb-2 text-right font-medium">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.order_items.map((item) => {
                      const qty = isEditing
                        ? (draftQty[item.id] ?? item.quantity)
                        : item.quantity;
                      return (
                        <tr key={item.id} className="border-t first:border-t-0">
                          <td className="py-1.5">
                            {item.menus?.name ?? "—"}
                            {item.is_special && (
                              <span className="ml-1 text-xs font-medium text-primary">
                                (พิเศษ)
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="size-6"
                                  disabled={pending || qty <= 1}
                                  onClick={() => changeDraft(item.id, qty - 1)}
                                  aria-label="ลดจำนวน"
                                >
                                  <Minus className="size-3" />
                                </Button>
                                <span className="w-6 text-center tabular-nums">
                                  {qty}
                                </span>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="size-6"
                                  disabled={pending}
                                  onClick={() => changeDraft(item.id, qty + 1)}
                                  aria-label="เพิ่มจำนวน"
                                >
                                  <Plus className="size-3" />
                                </Button>
                              </div>
                            ) : (
                              qty
                            )}
                          </td>
                          <td className="py-1.5 text-right">
                            {formatBaht(item.price)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">
                            {formatBaht(item.price * qty)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {order.note && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    หมายเหตุ: {order.note}
                  </p>
                )}

                {isEditing && (
                  <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                    <span className="text-muted-foreground">ยอดรวมใหม่</span>
                    <span className="font-bold tabular-nums text-primary">
                      {formatBaht(draftTotal)}
                    </span>
                  </div>
                )}

                {/* Actions — hidden for cancelled orders (immutable). */}
                {!isCancelled && (
                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
                    {mode === "view" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(order)}
                        >
                          <Pencil className="size-3.5" />
                          แก้ไข
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => setMode("confirmCancel")}
                        >
                          <X className="size-3.5" />
                          ยกเลิกออเดอร์
                        </Button>
                      </>
                    )}

                    {mode === "edit" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => setMode("view")}
                        >
                          ยกเลิกการแก้ไข
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending}
                          onClick={() => handleSave(order)}
                        >
                          {pending ? "กำลังบันทึก..." : "บันทึก"}
                        </Button>
                      </>
                    )}

                    {mode === "confirmCancel" && (
                      <div className="flex w-full flex-wrap items-center justify-end gap-2">
                        <span className="mr-auto text-sm text-muted-foreground">
                          ยืนยันยกเลิกออเดอร์นี้?
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => setMode("view")}
                        >
                          ไม่
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={pending}
                          onClick={() => handleCancel(order)}
                        >
                          {pending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
