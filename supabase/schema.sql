-- ============================================================
--  orderman — database schema SNAPSHOT (human-readable reference)
--
--  NOT the source of truth anymore. Schema changes go through the
--  Supabase CLI migrations workflow:
--    supabase/migrations/*.sql  →  npx supabase db push
--
--  Regenerate this snapshot after a migration with:
--    npx supabase db dump --linked -f supabase/schema.sql
--
--  Still idempotent, so it can be pasted into the SQL editor in a
--  pinch — but prefer migrations so prod history stays in sync.
-- ============================================================

-- ---------- Tables ----------

create table if not exists public.menus (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  price             numeric(10, 2) not null check (price >= 0),
  category          text not null check (category in ('อาหาร', 'เครื่องดื่ม', 'ของเพิ่ม')),
  is_available      boolean not null default true,
  -- Extra charge for the "พิเศษ" (extra portion) variant.
  -- NULL = this menu has no พิเศษ option.
  special_surcharge numeric(10, 2) check (special_surcharge > 0)
);

-- Idempotent upgrade for databases created before special_surcharge existed.
alter table public.menus
  add column if not exists special_surcharge numeric(10, 2) check (special_surcharge > 0);

-- Categories are user-managed (add/rename/delete from the /menu UI). The
-- canonical list + display order lives in public.categories; menus.category is
-- an FK so a rename cascades and an in-use category can't be deleted.
create table if not exists public.categories (
  name       text primary key,
  sort_order integer not null default 0
);

insert into public.categories (name, sort_order) values
  ('อาหาร', 1),
  ('ของเพิ่ม', 2),
  ('เครื่องดื่ม', 3)
on conflict (name) do nothing;

insert into public.categories (name, sort_order)
  select distinct category, 99 from public.menus
  on conflict (name) do nothing;

alter table public.menus drop constraint if exists menus_category_check;
alter table public.menus drop constraint if exists menus_category_fkey;
alter table public.menus
  add constraint menus_category_fkey foreign key (category)
    references public.categories(name) on update cascade on delete restrict;

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  total       numeric(10, 2) not null default 0 check (total >= 0),
  status      text not null default 'completed'
                check (status in ('completed', 'pending', 'cancelled')),
  note        text
);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  menu_id     uuid not null references public.menus(id),
  quantity    integer not null check (quantity > 0),
  -- Charged price per unit, surcharge included when is_special is true.
  price       numeric(10, 2) not null check (price >= 0),
  is_special  boolean not null default false
);

-- Idempotent upgrade for databases created before is_special existed.
alter table public.order_items
  add column if not exists is_special boolean not null default false;

create index if not exists menus_category_idx       on public.menus(category);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_menu_id_idx  on public.order_items(menu_id);
create index if not exists orders_created_at_idx    on public.orders(created_at);

-- ---------- Row Level Security ----------
-- Single-tenant restaurant app: any signed-in staff member gets full access.
-- Unauthenticated requests (anon role) match no policy and are denied.

alter table public.categories  enable row level security;
alter table public.menus       enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

grant select, insert, update, delete
  on public.categories, public.menus, public.orders, public.order_items
  to authenticated;

drop policy if exists "authenticated full access" on public.categories;
create policy "authenticated full access" on public.categories
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.menus;
create policy "authenticated full access" on public.menus
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.orders;
create policy "authenticated full access" on public.orders
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.order_items;
create policy "authenticated full access" on public.order_items
  for all to authenticated using (true) with check (true);

-- ---------- create_order() ----------
-- Inserts one order + N order_items atomically in a single transaction.
-- Each line price is snapshotted from the menus table SERVER-SIDE, so a
-- tampered client payload cannot change what the customer is charged.
-- p_items: jsonb array of objects
--   { "menu_id": <uuid>, "quantity": <int>, "is_special": <bool, optional> }

create or replace function public.create_order(p_note text, p_items jsonb)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_order_id   uuid;
  v_total      numeric(10, 2) := 0;
  v_item       jsonb;
  v_menu_id    uuid;
  v_qty        integer;
  v_is_special boolean;
  v_price      numeric(10, 2);
  v_surcharge  numeric(10, 2);
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  insert into public.orders (total, note)
  values (0, nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_menu_id    := (v_item ->> 'menu_id')::uuid;
    v_qty        := (v_item ->> 'quantity')::integer;
    v_is_special := coalesce((v_item ->> 'is_special')::boolean, false);

    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity for menu %', v_menu_id;
    end if;

    -- Trust the database, not the client, for both price and surcharge.
    select price, special_surcharge into v_price, v_surcharge
    from public.menus
    where id = v_menu_id and is_available = true;

    if v_price is null then
      raise exception 'Menu % not found or unavailable', v_menu_id;
    end if;

    if v_is_special then
      if v_surcharge is null then
        raise exception 'Menu % has no พิเศษ option', v_menu_id;
      end if;
      v_price := v_price + v_surcharge;
    end if;

    insert into public.order_items (order_id, menu_id, quantity, price, is_special)
    values (v_order_id, v_menu_id, v_qty, v_price, v_is_special);

    v_total := v_total + v_price * v_qty;
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.create_order(text, jsonb) to authenticated;

-- ---------- update_order_items() ----------
-- Syncs an order's items to the set the client sends, then recomputes the
-- order total from the SERVER-SIDE snapshot prices (order_items.price) — the
-- client sends only item_id + quantity, never a price, so it cannot change
-- what the customer is charged. Runs in a single transaction.
--   - items listed in p_items have their quantity updated
--   - items of this order NOT listed in p_items are deleted (line removal)
-- p_items must keep at least one item; cancel the order instead of emptying it.
-- p_items: jsonb array of objects { "item_id": <uuid>, "quantity": <int> }

create or replace function public.update_order_items(p_order_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  v_item    jsonb;
  v_item_id uuid;
  v_qty     integer;
  v_total   numeric(10, 2);
  v_keep    uuid[] := '{}';
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'An order must keep at least one item';
  end if;

  -- A cancelled order is immutable.
  perform 1 from public.orders
   where id = p_order_id and status <> 'cancelled';
  if not found then
    raise exception 'Order % not found or cancelled', p_order_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item ->> 'item_id')::uuid;
    v_qty     := (v_item ->> 'quantity')::integer;

    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity for item %', v_item_id;
    end if;

    -- Scope the update to this order so a tampered item_id belonging to
    -- another order cannot be edited through this call.
    update public.order_items
       set quantity = v_qty
     where id = v_item_id and order_id = p_order_id;

    if not found then
      raise exception 'Item % is not part of order %', v_item_id, p_order_id;
    end if;

    v_keep := array_append(v_keep, v_item_id);
  end loop;

  -- Drop any line the client removed from the order.
  delete from public.order_items
   where order_id = p_order_id and id <> all(v_keep);

  -- Recompute the total from the snapshotted unit prices.
  select coalesce(sum(price * quantity), 0) into v_total
  from public.order_items
  where order_id = p_order_id;

  update public.orders set total = v_total where id = p_order_id;
end;
$$;

grant execute on function public.update_order_items(uuid, jsonb) to authenticated;

-- ---------- Menu seed ----------
-- Remove the old demo menu. Safe to re-run and on fresh installs (matches
-- nothing). Won't hit a FK error as long as no saved order references these
-- rows — if it does, run `truncate public.orders, public.order_items;` once
-- first (clears all order history).
delete from public.menus
 where name in (
   'ชาไข่มุก', 'ราดหน้า', 'ผัดไทย', 'ข้าวผัด',
   'ส้มตำ', 'น้ำเต้าหู้', 'ชาเย็น', 'กาแฟเย็น'
 );

-- Real menu. special_surcharge = NULL means the item has no พิเศษ option.
insert into public.menus (name, price, category, special_surcharge) values
  ('ขนมจีนน้ำยากะทิ',     50, 'อาหาร', 10),
  ('ขนมจีนแกงเขียวหวาน',  50, 'อาหาร', 10),
  ('ขนมจีนน้ำยาป่า',      50, 'อาหาร', 10),
  ('ขนมจีนน้ำยาผสม',      50, 'อาหาร', 10),
  ('ก๋วยจั๊บญวน',         60, 'อาหาร',   10),
  ('ขาไก่',               10, 'ของเพิ่ม', null),
  ('ลูกชิ้น',             10, 'ของเพิ่ม', null),
  ('ไข่ต้ม',              10, 'ของเพิ่ม', null),
  ('ขนมจีน',               5, 'ของเพิ่ม', null)
on conflict (name) do update set
  price             = excluded.price,
  category          = excluded.category,
  special_surcharge = excluded.special_surcharge;
