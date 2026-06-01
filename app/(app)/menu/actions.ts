"use server";

import { revalidatePath } from "next/cache";

import type { MenuCategory } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES: MenuCategory[] = ["อาหาร", "เครื่องดื่ม", "ของเพิ่ม"];

export type MenuActionResult = { ok: true } | { ok: false; error: string };

export type MenuInput = {
  name: string;
  price: number;
  category: MenuCategory;
  special_surcharge: number | null;
};

/** Server-side validation — never trust the client payload. */
function validate(input: MenuInput): string | null {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name) return "กรุณากรอกชื่อเมนู";
  if (
    typeof input.price !== "number" ||
    !Number.isFinite(input.price) ||
    input.price < 0
  ) {
    return "ราคาไม่ถูกต้อง";
  }
  if (!CATEGORIES.includes(input.category)) return "หมวดหมู่ไม่ถูกต้อง";
  if (
    input.special_surcharge !== null &&
    (typeof input.special_surcharge !== "number" ||
      !Number.isFinite(input.special_surcharge) ||
      input.special_surcharge <= 0)
  ) {
    return "ราคาส่วนพิเศษต้องมากกว่า 0";
  }
  return null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createMenu(input: MenuInput): Promise<MenuActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

  const { error } = await supabase.from("menus").insert({
    name: input.name.trim(),
    price: input.price,
    category: input.category,
    special_surcharge: input.special_surcharge,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "มีเมนูชื่อนี้อยู่แล้ว" };
    console.error("createMenu error:", error);
    return { ok: false, error: "เพิ่มเมนูไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/menu");
  revalidatePath("/order");
  return { ok: true };
}

export async function updateMenu(
  id: string,
  input: MenuInput,
): Promise<MenuActionResult> {
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "เมนูไม่ถูกต้อง" };
  }
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

  // Editing price here does NOT touch past orders — order_items snapshots the
  // price at save time, so historical revenue stays correct.
  const { error } = await supabase
    .from("menus")
    .update({
      name: input.name.trim(),
      price: input.price,
      category: input.category,
      special_surcharge: input.special_surcharge,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "มีเมนูชื่อนี้อยู่แล้ว" };
    console.error("updateMenu error:", error);
    return { ok: false, error: "แก้ไขเมนูไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/menu");
  revalidatePath("/order");
  return { ok: true };
}

/** Soft enable/disable — disabled menus drop out of the order page (no hard
 * delete, so order_items FK + historical orders stay intact). */
export async function setMenuAvailability(
  id: string,
  available: boolean,
): Promise<MenuActionResult> {
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "เมนูไม่ถูกต้อง" };
  }
  if (typeof available !== "boolean") {
    return { ok: false, error: "ค่าสถานะไม่ถูกต้อง" };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

  const { error } = await supabase
    .from("menus")
    .update({ is_available: available })
    .eq("id", id);

  if (error) {
    console.error("setMenuAvailability error:", error);
    return { ok: false, error: "เปลี่ยนสถานะเมนูไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/menu");
  revalidatePath("/order");
  return { ok: true };
}
