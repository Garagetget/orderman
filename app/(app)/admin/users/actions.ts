"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/rbac/admin";
import { hasPermission } from "@/lib/rbac/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getUser } from "@/lib/supabase/server";

export type UserActionResult = { ok: true } | { ok: false; error: string };

// The RBAC tables (roles / user_roles) aren't in the generated Database type yet
// — schema.sql hasn't been regenerated (no Docker here to run `supabase db dump`).
// Until it is, query those tables through a localized `as any` cast so we don't
// loosen the whole client. `auth.admin` stays on the typed client. Remove once
// the types are regenerated.
function rbacAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as any;
}

// orderman ships two roles; user.manage is granted to owner only. Roles whose
// loss could lock the system out of user management are treated as "privileged".
const VALID_ROLES = ["owner", "staff"] as const;
type Role = (typeof VALID_ROLES)[number];
const PRIVILEGED_ROLE: Role = "owner";

function isValidRole(role: unknown): role is Role {
  return typeof role === "string" && (VALID_ROLES as readonly string[]).includes(role);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Re-resolves the caller every action so we never trust the proxy alone.
 * Reads the session identity (request-cached, shared with the hasPermission
 * check) — the privileged writes go through the admin client.
 */
async function getCaller() {
  return getUser();
}

/** Counts how many users currently hold the privileged (owner) role. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countPrivilegedUsers(admin: any): Promise<number> {
  const { count, error } = await admin
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role_key", PRIVILEGED_ROLE);
  if (error) throw error;
  return count ?? 0;
}

export async function createUser(input: {
  email: string;
  password: string;
  role: string;
}): Promise<UserActionResult> {
  const caller = await getCaller();
  if (!caller) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!(await hasPermission(PERMISSIONS.USER_MANAGE)))
    return { ok: false, error: "ไม่มีสิทธิ์" };

  const email = typeof input?.email === "string" ? input.email.trim() : "";
  const password = typeof input?.password === "string" ? input.password : "";
  const role = input?.role;

  if (!EMAIL_RE.test(email)) return { ok: false, error: "อีเมลไม่ถูกต้อง" };
  if (password.length < MIN_PASSWORD_LENGTH)
    return { ok: false, error: `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร` };
  if (!isValidRole(role)) return { ok: false, error: "บทบาทไม่ถูกต้อง" };

  const admin = rbacAdmin();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !created?.user) {
    // Supabase returns 422 / "already been registered" for a duplicate email.
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { ok: false, error: "มีผู้ใช้อีเมลนี้อยู่แล้ว" };
    }
    console.error("createUser error:", createErr);
    return { ok: false, error: "สร้างผู้ใช้ไม่สำเร็จ กรุณาลองใหม่" };
  }

  const { error: roleErr } = await admin
    .from("user_roles")
    .insert({ user_id: created.user.id, role_key: role });

  if (roleErr) {
    // Roll back the auth user so we don't leave an account with no role.
    await admin.auth.admin.deleteUser(created.user.id);
    console.error("createUser role-assign error:", roleErr);
    return { ok: false, error: "กำหนดบทบาทไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserRole(input: {
  userId: string;
  role: string;
}): Promise<UserActionResult> {
  const caller = await getCaller();
  if (!caller) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!(await hasPermission(PERMISSIONS.USER_MANAGE)))
    return { ok: false, error: "ไม่มีสิทธิ์" };

  const userId = typeof input?.userId === "string" ? input.userId : "";
  const role = input?.role;
  if (!userId) return { ok: false, error: "ผู้ใช้ไม่ถูกต้อง" };
  if (!isValidRole(role)) return { ok: false, error: "บทบาทไม่ถูกต้อง" };

  const admin = rbacAdmin();

  // Self-protection: the caller can't demote themselves out of the privileged
  // role (would strip their own user.manage and lock them out).
  if (userId === caller.id && role !== PRIVILEGED_ROLE) {
    return { ok: false, error: "ห้ามถอดสิทธิ์ของตัวเอง" };
  }

  // Last-owner protection: if this change would remove the privileged role from
  // the only remaining owner, reject so the system never loses user management.
  if (role !== PRIVILEGED_ROLE) {
    const { data: existing, error: readErr } = await admin
      .from("user_roles")
      .select("role_key")
      .eq("user_id", userId);
    if (readErr) {
      console.error("setUserRole read error:", readErr);
      return { ok: false, error: "เปลี่ยนบทบาทไม่สำเร็จ กรุณาลองใหม่" };
    }
    const wasPrivileged = (existing ?? []).some(
      (r: { role_key: string }) => r.role_key === PRIVILEGED_ROLE,
    );
    if (wasPrivileged) {
      const owners = await countPrivilegedUsers(admin).catch(() => -1);
      if (owners === -1) return { ok: false, error: "เปลี่ยนบทบาทไม่สำเร็จ กรุณาลองใหม่" };
      if (owners <= 1) {
        return { ok: false, error: "ต้องมีเจ้าของอย่างน้อย 1 คน" };
      }
    }
  }

  // One role per user in orderman: clear existing rows, then assign the new one.
  const { error: delErr } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (delErr) {
    console.error("setUserRole delete error:", delErr);
    return { ok: false, error: "เปลี่ยนบทบาทไม่สำเร็จ กรุณาลองใหม่" };
  }

  const { error: insErr } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role_key: role });
  if (insErr) {
    console.error("setUserRole insert error:", insErr);
    return { ok: false, error: "เปลี่ยนบทบาทไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUser(input: {
  userId: string;
}): Promise<UserActionResult> {
  const caller = await getCaller();
  if (!caller) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!(await hasPermission(PERMISSIONS.USER_MANAGE)))
    return { ok: false, error: "ไม่มีสิทธิ์" };

  const userId = typeof input?.userId === "string" ? input.userId : "";
  if (!userId) return { ok: false, error: "ผู้ใช้ไม่ถูกต้อง" };
  if (userId === caller.id) return { ok: false, error: "ห้ามลบบัญชีตัวเอง" };

  const admin = rbacAdmin();

  // Last-owner protection: don't delete the final user that holds user.manage.
  const { data: existing, error: readErr } = await admin
    .from("user_roles")
    .select("role_key")
    .eq("user_id", userId);
  if (readErr) {
    console.error("deleteUser read error:", readErr);
    return { ok: false, error: "ลบผู้ใช้ไม่สำเร็จ กรุณาลองใหม่" };
  }
  const isPrivileged = (existing ?? []).some(
    (r: { role_key: string }) => r.role_key === PRIVILEGED_ROLE,
  );
  if (isPrivileged) {
    const owners = await countPrivilegedUsers(admin).catch(() => -1);
    if (owners === -1) return { ok: false, error: "ลบผู้ใช้ไม่สำเร็จ กรุณาลองใหม่" };
    if (owners <= 1) return { ok: false, error: "ลบเจ้าของคนสุดท้ายไม่ได้" };
  }

  // FK on user_roles is ON DELETE CASCADE, so removing the auth user drops its
  // role rows too.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error("deleteUser error:", delErr);
    return { ok: false, error: "ลบผู้ใช้ไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}
