"use server";

import { revalidatePath } from "next/cache";

import type { Json } from "@/lib/database.types";
import { hasPermission } from "@/lib/rbac/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";

export type MenuItemInput = {
  menu_id: string;
  quantity: number;
  is_special?: boolean;
};

/** Off-menu line (T17): name + price typed by staff, no menus row to snapshot. */
export type ManualItemInput = {
  custom_name: string;
  price: number;
  quantity: number;
};

export type OrderItemInput = MenuItemInput | ManualItemInput;

function isManualInput(item: OrderItemInput): item is ManualItemInput {
  return "custom_name" in item;
}

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

  // Validate the payload server-side — never trust the client. (The RPC
  // re-validates and snapshots menu prices; manual-line prices can only come
  // from the client, so we reject anything not a finite, non-negative number.)
  for (const item of items) {
    if (!item || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return { ok: false, error: "รายการออเดอร์ไม่ถูกต้อง" };
    }
    if (isManualInput(item)) {
      if (
        typeof item.custom_name !== "string" ||
        item.custom_name.trim() === "" ||
        typeof item.price !== "number" ||
        !Number.isFinite(item.price) ||
        item.price < 0
      ) {
        return { ok: false, error: "รายการนอกเมนูไม่ถูกต้อง" };
      }
    } else if (
      typeof item.menu_id !== "string" ||
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
  // Authorization, not just authentication: a Server Action is a public endpoint
  // callable straight from the bundle, so re-check the permission here too. (T36)
  if (!(await hasPermission(PERMISSIONS.ORDER_CREATE))) {
    return { ok: false, error: "ไม่มีสิทธิ์" };
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
