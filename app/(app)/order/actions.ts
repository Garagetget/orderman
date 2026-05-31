"use server";

import { revalidatePath } from "next/cache";

import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type OrderItemInput = {
  menu_id: string;
  quantity: number;
  is_special?: boolean;
};

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

/**
 * Saves an order via the create_order() Postgres function, which inserts the
 * order + its items in one transaction and snapshots prices server-side.
 */
export async function createOrder(
  items: OrderItemInput[],
  note: string,
): Promise<CreateOrderResult> {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "ยังไม่มีรายการในออเดอร์" };
  }

  // Validate the payload server-side — never trust the client.
  for (const item of items) {
    if (
      typeof item?.menu_id !== "string" ||
      !Number.isInteger(item?.quantity) ||
      item.quantity < 1 ||
      (item.is_special !== undefined && typeof item.is_special !== "boolean")
    ) {
      return { ok: false, error: "รายการออเดอร์ไม่ถูกต้อง" };
    }
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  }

  const { data, error } = await supabase.rpc("create_order", {
    p_note: note.trim() || null,
    p_items: items as Json,
  });

  if (error) {
    return { ok: false, error: "บันทึกออเดอร์ไม่สำเร็จ กรุณาลองใหม่" };
  }

  // Refresh the dashboard so the new sale shows up immediately.
  revalidatePath("/dashboard");
  return { ok: true, orderId: data };
}
