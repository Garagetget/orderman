"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Order, OrderItem } from "@/lib/database.types";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";

export type OrderWithItems = Order & {
  order_items: (Omit<OrderItem, "menu_id"> & {
    menus: { name: string } | null;
  })[];
};

function formatBangkokDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function OrderHistoryView({ orders }: { orders: OrderWithItems[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        ยังไม่มีออเดอร์
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const isOpen = openId === order.id;
        const isCancelled = order.status === "cancelled";

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
              onClick={() => setOpenId(isOpen ? null : order.id)}
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
                    {order.order_items.map((item) => (
                      <tr key={item.id} className="border-t first:border-t-0">
                        <td className="py-1.5">
                          {item.menus?.name ?? "—"}
                          {item.is_special && (
                            <span className="ml-1 text-xs font-medium text-primary">
                              (พิเศษ)
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-right">{item.quantity}</td>
                        <td className="py-1.5 text-right">
                          {formatBaht(item.price)}
                        </td>
                        <td className="py-1.5 text-right">
                          {formatBaht(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {order.note && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    หมายเหตุ: {order.note}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
