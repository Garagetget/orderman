-- RBAC foundation: roles / permissions / role_permissions / user_roles
-- + SECURITY DEFINER helper functions + RLS + app-specific seed + backfill.
--
-- Design (Phase 5):
--   * Permission resolution = query DB per request (user_roles -> role_permissions).
--     DB is the single source of truth; changing a role takes effect immediately,
--     no re-login. Supabase Auth stays the identity provider (login/JWT untouched).
--   * Writes to RBAC tables are denied for normal `authenticated` sessions (no write
--     policy). Only `service_role` (bypasses RLS) can mutate them, via a server-side
--     admin client (T27/T29). A user therefore cannot grant itself a role.
--
-- This migration is orderman-specific because of the backfill from the legacy
-- `auth.users.raw_app_meta_data->>'role'`. The generic, portable version (tables +
-- helpers + RLS + seed, no backfill) lives in supabase/rbac/rbac.sql.
--
-- Idempotent: safe to re-run.

-- ========================================================================
-- CORE TABLES (generic — portable across projects)
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
-- HELPER FUNCTIONS (SECURITY DEFINER so they can read user_roles even when the
-- caller has no direct SELECT path; also usable inside other tables' RLS policies).
-- search_path is pinned to avoid search-path hijacking on a SECURITY DEFINER fn.
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
-- service_role bypasses RLS and owns the tables (created in this migration),
-- so the admin path retains full write access.
-- ========================================================================

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles       enable row level security;

-- SELECT only; intentionally NO insert/update/delete grant to authenticated.
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
-- ===== APP-SPECIFIC SEED (edit per project) =============================
-- orderman catalog: 5 permissions, 2 roles, role grants.
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

-- owner -> all 5 permissions
insert into public.role_permissions (role_key, permission_key)
  select 'owner', key from public.permissions
on conflict (role_key, permission_key) do nothing;

-- staff -> order.create + order.history.view
insert into public.role_permissions (role_key, permission_key) values
  ('staff', 'order.create'),
  ('staff', 'order.history.view')
on conflict (role_key, permission_key) do nothing;

-- ========================================================================
-- ===== ORDERMAN-SPECIFIC BACKFILL (NOT portable) ========================
-- Map existing users from the legacy auth metadata role to a user_roles row,
-- so nobody is locked out when T28 stops reading raw_app_meta_data.
--   raw_app_meta_data->>'role' = 'staff'  -> role 'staff'
--   anything else (incl. null)            -> role 'owner'
-- raw_app_meta_data is left untouched (kept for rollback).
-- ========================================================================

insert into public.user_roles (user_id, role_key)
  select id,
         case when raw_app_meta_data->>'role' = 'staff' then 'staff' else 'owner' end
  from auth.users
on conflict (user_id, role_key) do nothing;
