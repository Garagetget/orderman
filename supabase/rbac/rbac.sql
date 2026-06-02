-- =====================================================================
-- Portable RBAC layer for Supabase projects
-- =====================================================================
-- A single, self-contained, re-runnable SQL block. It provisions a generic
-- role-based access-control layer on top of Supabase Auth:
--
--   * tables:    roles, permissions, role_permissions, user_roles
--   * functions: auth_has_permission(text), auth_user_permissions()
--   * RLS:       read-only for `authenticated`; all writes denied for normal
--                sessions (only `service_role`, which bypasses RLS, may write).
--
-- HOW TO USE IN A NEW PROJECT
--   1. Open the Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
--      (It is idempotent, so re-running is safe.)
--   2. Edit ONLY the "APP-SPECIFIC SEED" section below: list your project's
--      permissions, roles, and which permissions each role grants.
--   3. Wire up your app:
--        - call rpc `auth_has_permission('some.permission')` to gate a single check
--        - call rpc `auth_user_permissions()` to fetch the current user's permissions
--      Write user_roles / RBAC config ONLY through a server-side admin client that
--      uses the `service_role` key (never expose that key to the browser).
--   4. BACKFILL is project-specific and intentionally NOT included here. After the
--      first deploy, assign at least one user the role that holds your "manage users"
--      permission (e.g. via SQL Editor or your admin client) so you are not locked
--      out. Example:
--        insert into public.user_roles (user_id, role_key)
--          values ('<auth-user-uuid>', 'owner') on conflict do nothing;
--
-- DESIGN NOTES
--   * Permissions are resolved by querying the DB per request (no JWT claims / Auth
--     Hook), so role changes take effect immediately without re-login.
--   * Keep this file as a pure authorization layer — do NOT add app business logic
--     here, so it stays portable.
-- =====================================================================

-- ========================================================================
-- CORE TABLES (generic — do not rename)
-- ========================================================================

create table if not exists public.roles (
  key   text primary key,
  label text not null
);

create table if not exists public.permissions (
  key         text primary key,
  label       text not null,
  description text
);

create table if not exists public.role_permissions (
  role_key       text not null references public.roles(key)       on update cascade on delete cascade,
  permission_key text not null references public.permissions(key) on update cascade on delete cascade,
  primary key (role_key, permission_key)
);

create table if not exists public.user_roles (
  user_id  uuid not null references auth.users(id)   on delete cascade,
  role_key text not null references public.roles(key) on update cascade on delete cascade,
  primary key (user_id, role_key)
);

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists role_permissions_role_key_idx on public.role_permissions(role_key);

-- ========================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER, pinned search_path)
-- ========================================================================

create or replace function public.auth_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_key = ur.role_key
    where ur.user_id = auth.uid()
      and rp.permission_key = p_permission
  );
$$;

create or replace function public.auth_user_permissions()
returns setof text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct rp.permission_key
  from public.user_roles ur
  join public.role_permissions rp on rp.role_key = ur.role_key
  where ur.user_id = auth.uid();
$$;

grant execute on function public.auth_has_permission(text) to authenticated;
grant execute on function public.auth_user_permissions() to authenticated;

-- ========================================================================
-- RLS — read-only for authenticated, all writes denied (no write policy).
-- service_role bypasses RLS, so the server-side admin path keeps full write.
-- ========================================================================

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles       enable row level security;

grant select on public.roles            to authenticated;
grant select on public.permissions      to authenticated;
grant select on public.role_permissions to authenticated;
grant select on public.user_roles       to authenticated;

drop policy if exists "authenticated can read roles" on public.roles;
create policy "authenticated can read roles" on public.roles
  for select to authenticated using (true);

drop policy if exists "authenticated can read permissions" on public.permissions;
create policy "authenticated can read permissions" on public.permissions
  for select to authenticated using (true);

drop policy if exists "authenticated can read role_permissions" on public.role_permissions;
create policy "authenticated can read role_permissions" on public.role_permissions
  for select to authenticated using (true);

drop policy if exists "authenticated can read user_roles" on public.user_roles;
create policy "authenticated can read user_roles" on public.user_roles
  for select to authenticated using (true);

-- ========================================================================
-- ===== APP-SPECIFIC SEED (EDIT THIS PER PROJECT) ========================
-- Replace the catalog below with your project's permissions, roles, and grants.
-- Everything here is idempotent. Backfill of user_roles is project-specific and
-- NOT included (see header note 4).
--
-- Current contents = orderman's catalog (example):
-- ========================================================================

insert into public.permissions (key, label, description) values
  ('order.create',        'รับออเดอร์',        'สร้างออเดอร์ในหน้าจดออเดอร์'),
  ('order.history.view',  'ดูประวัติออเดอร์',  'ดู/แก้/ยกเลิกออเดอร์ในประวัติ'),
  ('menu.manage',         'จัดการเมนู',        'เพิ่ม/แก้/ปิด เมนูและหมวดหมู่'),
  ('dashboard.view',      'ดูแดชบอร์ดยอดขาย',  'ดูสรุปยอดขาย'),
  ('user.manage',         'จัดการผู้ใช้',      'เพิ่ม/ลบ ผู้ใช้และกำหนดสิทธิ์')
on conflict (key) do update
  set label = excluded.label,
      description = excluded.description;

insert into public.roles (key, label) values
  ('owner', 'เจ้าของร้าน'),
  ('staff', 'พนักงาน')
on conflict (key) do update
  set label = excluded.label;

-- owner -> all permissions
insert into public.role_permissions (role_key, permission_key)
  select 'owner', key from public.permissions
on conflict (role_key, permission_key) do nothing;

-- staff -> order.create + order.history.view
insert into public.role_permissions (role_key, permission_key) values
  ('staff', 'order.create'),
  ('staff', 'order.history.view')
on conflict (role_key, permission_key) do nothing;
