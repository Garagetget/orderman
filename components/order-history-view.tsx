"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  Minus,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { cancelOrder, updateOrderItems } from "@/app/(app)/order-history/actions";
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
  // Item ids the user marked for removal in the current edit session.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Receipt className="size-12 text-secondary opacity-50" />
        <p className="mt-3 text-sm text-secondary">ยังไม่มีออเดอร์</p>
      </div>
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
    setRemovedIds(new Set());
    setMode("edit");
  }

  function changeDraft(itemId: string, next: number) {
    if (next < 1) return; // use the trash button to remove a whole line
    setDraftQty((prev) => ({ ...prev, [itemId]: next }));
  }

  function toggleRemoved(itemId: string) {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function handleSave(order: OrderWithItems) {
    const items = order.order_items
      .filter((it) => !removedIds.has(it.id))
      .map((it) => ({ item_id: it.id, quantity: draftQty[it.id] ?? it.quantity }));

    if (items.length === 0) {
      toast.error("ออเดอร์ต้องมีอย่างน้อย 1 รายการ — ถ้าต้องการล้าง ให้ยกเลิกออเดอร์");
      return;
    }

    const unchanged =
      removedIds.size === 0 &&
      order.order_items.every(
        (it) => (draftQty[it.id] ?? it.quantity) === it.quantity,
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
    <div className="space-y-3">
      {orders.map((order) => {
        const isOpen = openId === order.id;
        const isCancelled = order.status === "cancelled";
        const isEditing = isOpen && mode === "edit";

        const draftTotal = order.order_items.reduce(
          (sum, it) =>
            removedIds.has(it.id)
              ? sum
              : sum + it.price * (draftQty[it.id] ?? it.quantity),
          0,
        );
        // Don't let the user delete the last remaining line.
        const activeCount = isEditing
          ? order.order_items.filter((it) => !removedIds.has(it.id)).length
          : order.order_items.length;

        return (
          <div
            key={order.id}
            className={cn(
              "overflow-hidden rounded-xl border border-border bg-surface",
              isCancelled && "opacity-50",
            )}
          >
            <button
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
              onClick={() => toggleOpen(order.id)}
            >
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-secondary transition-transform duration-150",
                  isOpen && "rotate-180",
                )}
              />
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <div className="flex min-w-0 flex-col">
                  <span className="font-mono text-xs text-secondary">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span className="text-sm">
                    {formatBangkokDateTime(order.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-sm text-secondary sm:inline">
                    {order.order_items.length} รายการ
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatBaht(order.total)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      isCancelled
                        ? "bg-danger/10 text-danger"
                        : "bg-accent/10 text-accent",
                    )}
                  >
                    {isCancelled ? "ยกเลิก" : "สำเร็จ"}
                  </span>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border px-4 py-3">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="text-left text-xs text-secondary">
                      <th className="pb-2 font-medium">รายการ</th>
                      <th className="w-28 pb-2 text-right font-medium">จำนวน</th>
                      <th className="w-20 pb-2 text-right font-medium">ราคา/ชิ้น</th>
                      <th className="w-20 pb-2 text-right font-medium">รวม</th>
                      {isEditing && <th className="w-10 pb-2" aria-hidden />}
                    </tr>
                  </thead>
                  <tbody>
                    {order.order_items.map((item) => {
                      const qty = isEditing
                        ? (draftQty[item.id] ?? item.quantity)
                        : item.quantity;
                      const isRemoved = isEditing && removedIds.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            "border-t border-border first:border-t-0",
                            isRemoved && "text-secondary line-through",
                          )}
                        >
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
                                  className="size-6 rounded-lg border-border bg-surface"
                                  disabled={pending || isRemoved || qty <= 1}
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
                                  className="size-6 rounded-lg border-border bg-surface"
                                  disabled={pending || isRemoved}
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
                          <td className="py-1.5 text-right tabular-nums">
                            {formatBaht(item.price)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">
                            {formatBaht(item.price * qty)}
                          </td>
                          {isEditing && (
                            <td className="py-1.5 pl-2 text-right">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-6 rounded-lg text-secondary hover:text-danger"
                                // Keep at least one active line.
                                disabled={
                                  pending || (!isRemoved && activeCount <= 1)
                                }
                                onClick={() => toggleRemoved(item.id)}
                                aria-label={isRemoved ? "คืนค่ารายการ" : "ลบรายการ"}
                              >
                                {isRemoved ? (
                                  <RotateCcw className="size-3.5" />
                                ) : (
                                  <Trash2 className="size-3.5" />
                                )}
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {order.note && (
                  <p className="mt-3 text-xs text-secondary">
                    หมายเหตุ: {order.note}
                  </p>
                )}

                {isEditing && (
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-secondary">ยอดรวมใหม่</span>
                    <span className="font-bold tabular-nums text-primary">
                      {formatBaht(draftTotal)}
                    </span>
                  </div>
                )}

                {/* Actions — hidden for cancelled orders (immutable). */}
                {!isCancelled && (
                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                    {mode === "view" && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-lg border border-border bg-surface px-4 py-2.5 hover:bg-muted"
                          onClick={() => startEdit(order)}
                        >
                          <Pencil className="size-3.5" />
                          แก้ไข
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-lg border border-danger bg-transparent px-4 py-2.5 text-danger hover:bg-danger/10 hover:text-danger"
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
                          variant="ghost"
                          className="rounded-lg border border-border bg-surface px-4 py-2.5 hover:bg-muted"
                          disabled={pending}
                          onClick={() => setMode("view")}
                        >
                          ยกเลิกการแก้ไข
                        </Button>
                        <Button
                          type="button"
                          className="rounded-lg bg-primary px-6 py-2.5 text-white hover:bg-primary-hover"
                          disabled={pending}
                          onClick={() => handleSave(order)}
                        >
                          {pending ? "กำลังบันทึก..." : "บันทึก"}
                        </Button>
                      </>
                    )}

                    {mode === "confirmCancel" && (
                      <div className="flex w-full flex-wrap items-center justify-end gap-2">
                        <span className="mr-auto text-sm text-secondary">
                          ยืนยันยกเลิกออเดอร์นี้?
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-lg border border-border bg-surface px-4 py-2.5 hover:bg-muted"
                          disabled={pending}
                          onClick={() => setMode("view")}
                        >
                          ไม่
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-lg border border-danger bg-transparent px-4 py-2.5 text-danger hover:bg-danger/10 hover:text-danger"
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
