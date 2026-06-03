-- ============================================================
--  Clear order history (orders + order_items)
--  KEEPS menus, categories, users, roles, RBAC config.
--  Use to wipe throwaway test orders before a client goes live.
--
--  ⚠️ DESTRUCTIVE + IRREVERSIBLE. There is no undo. Double-check the
--     project before running.
--
--  HOW TO RUN
--    1. Supabase Dashboard → select the TARGET project
--         • PROD = orderman-prod  (ref jtjevgotgajdulkyikkj)
--         • dev  = orderman       (ref osqhsgolczlptfihfrry)
--       Make sure the project name at the top-left is the one you mean.
--    2. SQL Editor → New query → paste this whole file → Run.
--       (The SQL Editor runs as the service role and bypasses RLS.)
--
--  PREVIEW FIRST (optional): run only the first SELECT below to see how
--  many rows will be deleted before you run the whole script.
-- ============================================================

begin;

-- How many rows will be removed (sanity check).
select
  (select count(*) from public.orders)      as orders_before,
  (select count(*) from public.order_items) as order_items_before;

-- order_items.order_id is ON DELETE CASCADE, so truncating orders also
-- clears order_items. Menus/categories/users/roles are untouched.
truncate table public.orders cascade;

-- Confirm both tables are now empty.
select
  (select count(*) from public.orders)      as orders_after,
  (select count(*) from public.order_items) as order_items_after;

commit;
