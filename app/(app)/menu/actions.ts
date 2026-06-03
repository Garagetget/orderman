"use server";

import { revalidatePath } from "next/cache";

import type { MenuCategory } from "@/lib/database.types";
import { hasPermission } from "@/lib/rbac/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createClient, getUser } from "@/lib/supabase/server";

export type MenuActionResult = { ok: true } | { ok: false; error: string };

export type MenuInput = {
  name: string;
  price: number;
  category: MenuCategory;
  special_surcharge: number | null;
};

/** Server-side validation — never trust the client payload. The category's
 * existence is enforced by the FK (23503 mapped below), so we only shape-check. */
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
  if (typeof input.category !== "string" || input.category.trim().length === 0) {
    return "กรุณาเลือกหมวดหมู่";
  }
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
  // getUser() is request-cached (T32) so this shares one Auth roundtrip with the
  // hasPermission() check below instead of validating the token twice.
  const [supabase, user] = await Promise.all([createClient(), getUser()]);
  return { supabase, user };
}

export async function createMenu(input: MenuInput): Promise<MenuActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!(await hasPermission(PERMISSIONS.MENU_MANAGE)))
    return { ok: false, error: "ไม่มีสิทธิ์" };

  const { error } = await supabase.from("menus").insert({
    name: input.name.trim(),
    price: input.price,
    category: input.category,
    special_surcharge: input.special_surcharge,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "มีเมนูชื่อนี้อยู่แล้ว" };
    if (error.code === "23503") return { ok: false, error: "หมวดหมู่ไม่ถูกต้อง" };
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
  if (!(await hasPermission(PERMISSIONS.MENU_MANAGE)))
    return { ok: false, error: "ไม่มีสิทธิ์" };

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
    if (error.code === "23503") return { ok: false, error: "หมวดหมู่ไม่ถูกต้อง" };
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
  if (!(await hasPermission(PERMISSIONS.MENU_MANAGE)))
    return { ok: false, error: "ไม่มีสิทธิ์" };

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

// ---------- Categories ----------

export async function createCategory(name: string): Promise<MenuActionResult> {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return { ok: false, error: "กรุณากรอกชื่อหมวดหมู่" };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!(await hasPermission(PERMISSIONS.MENU_MANAGE)))
    return { ok: false, error: "ไม่มีสิทธิ์" };

  // New categories sort to the end of the list.
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("categories")
    .insert({ name: trimmed, sort_order: nextOrder });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "มีหมวดหมู่นี้อยู่แล้ว" };
    console.error("createCategory error:", error);
    return { ok: false, error: "เพิ่มหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/menu");
  revalidatePath("/order");
  return { ok: true };
}

/** Renames a category. The FK's ON UPDATE CASCADE repoints every menu in it. */
export async function renameCategory(
  oldName: string,
  newName: string,
): Promise<MenuActionResult> {
  const trimmed = typeof newName === "string" ? newName.trim() : "";
  if (typeof oldName !== "string" || oldName.length === 0) {
    return { ok: false, error: "หมวดหมู่ไม่ถูกต้อง" };
  }
  if (!trimmed) return { ok: false, error: "กรุณากรอกชื่อหมวดหมู่" };
  if (trimmed === oldName) return { ok: true };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!(await hasPermission(PERMISSIONS.MENU_MANAGE)))
    return { ok: false, error: "ไม่มีสิทธิ์" };

  const { error } = await supabase
    .from("categories")
    .update({ name: trimmed })
    .eq("name", oldName);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "มีหมวดหมู่นี้อยู่แล้ว" };
    console.error("renameCategory error:", error);
    return { ok: false, error: "แก้ไขหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/menu");
  revalidatePath("/order");
  return { ok: true };
}

/** Deletes a category. Blocked by the FK (23503) if any menu still uses it. */
export async function deleteCategory(name: string): Promise<MenuActionResult> {
  if (typeof name !== "string" || name.length === 0) {
    return { ok: false, error: "หมวดหมู่ไม่ถูกต้อง" };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!(await hasPermission(PERMISSIONS.MENU_MANAGE)))
    return { ok: false, error: "ไม่มีสิทธิ์" };

  const { error } = await supabase.from("categories").delete().eq("name", name);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "มีเมนูในหมวดนี้อยู่ — ย้ายหรือลบเมนูออกก่อนจึงลบหมวดได้",
      };
    }
    console.error("deleteCategory error:", error);
    return { ok: false, error: "ลบหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/menu");
  revalidatePath("/order");
  return { ok: true };
}
