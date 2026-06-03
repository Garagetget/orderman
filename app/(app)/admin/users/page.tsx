import { AdminUsersView } from "@/components/admin-users-view";
import { createAdminClient } from "@/lib/rbac/admin";
import { requirePermission } from "@/lib/rbac/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type AdminUser = {
  id: string;
  email: string;
  roles: string[];
};

export type RoleOption = {
  key: string;
  label: string;
};

export default async function AdminUsersPage() {
  await requirePermission(PERMISSIONS.USER_MANAGE);

  // The caller's id lets the client disable self-destructive controls (the
  // server actions are the real guard; this is just UX). Request-cached, so this
  // reuses the getUser() already resolved by requirePermission above.
  const caller = await getUser();

  // RBAC tables + the auth admin API aren't in the generated Database type yet
  // (schema.sql not regenerated — no Docker). Cast localized.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const [usersRes, rolesRes, userRolesRes] = await Promise.all([
    admin.auth.admin.listUsers(),
    admin.from("roles").select("key, label").order("key", { ascending: true }),
    admin.from("user_roles").select("user_id, role_key"),
  ]);

  const loadError =
    usersRes.error ?? rolesRes.error ?? userRolesRes.error ?? null;

  const rolesByUser = new Map<string, string[]>();
  for (const row of (userRolesRes.data ?? []) as {
    user_id: string;
    role_key: string;
  }[]) {
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(row.role_key);
    rolesByUser.set(row.user_id, list);
  }

  const users: AdminUser[] = (
    (usersRes.data?.users ?? []) as { id: string; email?: string | null }[]
  ).map((u) => ({
    id: u.id,
    email: u.email ?? "(ไม่มีอีเมล)",
    roles: rolesByUser.get(u.id) ?? [],
  }));

  // Owners first, then by email, so the list is stable + readable.
  users.sort((a, b) => {
    const ao = a.roles.includes("owner") ? 0 : 1;
    const bo = b.roles.includes("owner") ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return a.email.localeCompare(b.email);
  });

  const roleOptions: RoleOption[] = (
    (rolesRes.data ?? []) as { key: string; label: string | null }[]
  ).map((r) => ({ key: r.key, label: r.label ?? r.key }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">จัดการผู้ใช้</h1>
        <p className="mt-1 text-sm text-secondary">
          เพิ่ม ลบ หรือเปลี่ยนบทบาทผู้ใช้ — เปลี่ยนบทบาทมีผลทันทีไม่ต้องเข้าระบบใหม่
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-danger">
          โหลดรายชื่อผู้ใช้ไม่สำเร็จ: {loadError.message}
        </p>
      ) : (
        <AdminUsersView
          users={users}
          roleOptions={roleOptions}
          currentUserId={caller?.id ?? ""}
        />
      )}
    </div>
  );
}
