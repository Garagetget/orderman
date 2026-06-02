-- Make menu categories user-managed (add / rename / delete from the /menu UI)
-- instead of a hardcoded CHECK constraint.
--
-- A `categories` table becomes the canonical list + display order. menus.category
-- turns into an FK so that:
--   - renaming a category cascades to its menus (ON UPDATE CASCADE)
--   - a category still used by a menu cannot be deleted (ON DELETE RESTRICT)
-- Idempotent.

create table if not exists public.categories (
  name       text primary key,
  sort_order integer not null default 0
);

-- Seed the three categories that used to be hardcoded.
insert into public.categories (name, sort_order) values
  ('อาหาร', 1),
  ('ของเพิ่ม', 2),
  ('เครื่องดื่ม', 3)
on conflict (name) do nothing;

-- Backfill any category already used by a menu but missing from the table
-- (keeps the FK addition below from failing on unexpected data).
insert into public.categories (name, sort_order)
  select distinct category, 99 from public.menus
  on conflict (name) do nothing;

-- Replace the old hardcoded CHECK with a real FK.
alter table public.menus drop constraint if exists menus_category_check;
alter table public.menus drop constraint if exists menus_category_fkey;
alter table public.menus
  add constraint menus_category_fkey foreign key (category)
    references public.categories(name) on update cascade on delete restrict;

create index if not exists menus_category_idx on public.menus(category);

-- ---------- RLS (mirror the other tables: signed-in staff = full access) ----------
alter table public.categories enable row level security;

grant select, insert, update, delete on public.categories to authenticated;

drop policy if exists "authenticated full access" on public.categories;
create policy "authenticated full access" on public.categories
  for all to authenticated using (true) with check (true);
