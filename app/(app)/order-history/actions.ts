"use server";

import { revalidatePath } from "next/cache";

import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type OrderActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type ItemQuantityInput = {
  item_id: string;
  quantity: number;
};

/** Marks an order as cancelled. Cancelled orders drop out of the dashboard. */
export async function cancelOrder(orderId: string): Promise<OrderActionResult> {
  if (typeof orderId !== "string" || orderId.length === 0) {
    return { ok: false, error: "ออเดอร์ไม่ถูกต้อง" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);

  if (error) {
    return { ok: false, error: "ยกเลิกออเดอร์ไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/order-history");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Edits item quantities in an order. The update_order_items() RPC recomputes
 * the order total server-side from snapshot prices, so the client never sends
 * (or influences) a price.
 */
export async function updateOrderItems(
  orderId: string,
  items: ItemQuantityInput[],
): Promise<OrderActionResult> {
  if (typeof orderId !== "string" || orderId.length === 0) {
    return { ok: false, error: "ออเดอร์ไม่ถูกต้อง" };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "ไม่มีรายการให้แก้ไข" };
  }

  for (const item of items) {
    if (
      typeof item?.item_id !== "string" ||
      !Number.isInteger(item?.quantity) ||
      item.quantity < 1
    ) {
      return { ok: false, error: "จำนวนไม่ถูกต้อง" };
    }
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  }

  const { error } = await supabase.rpc("update_order_items", {
    p_order_id: orderId,
    p_items: items as Json,
  });

  if (error) {
    return { ok: false, error: "แก้ไขออเดอร์ไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/order-history");
  revalidatePath("/dashboard");
  return { ok: true };
}
