-- ============================================================
--  orderman — database schema
--  Run this whole file in the Supabase SQL editor:
--    Dashboard → SQL Editor → New query → paste → Run
--  Safe to run more than once (idempotent).
-- ============================================================

-- ---------- Tables ----------

create table if not exists public.menus (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  price         numeric(10, 2) not null check (price >= 0),
  category      text not null check (category in ('อาหาร', 'เครื่องดื่ม')),
  is_available  boolean not null default true
);

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  total       numeric(10, 2) not null default 0 check (total >= 0),
  status      text not null default 'completed'
                check (status in ('completed', 'pending', 'cancelled')),
  note        text
);

create table if not exists public.order_items (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references public.orders(id) on delete cascade,
  menu_id   uuid not null references public.menus(id),
  quantity  integer not null check (quantity > 0),
  price     numeric(10, 2) not null check (price >= 0)
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_menu_id_idx  on public.order_items(menu_id);
create index if not exists orders_created_at_idx    on public.orders(created_at);

-- ---------- Row Level Security ----------
-- Single-tenant restaurant app: any signed-in staff member gets full access.
-- Unauthenticated requests (anon role) match no policy and are denied.

alter table public.menus       enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

grant select, insert, update, delete
  on public.menus, public.orders, public.order_items
  to authenticated;

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
-- p_items: jsonb array of objects { "menu_id": <uuid>, "quantity": <int> }

create or replace function public.create_order(p_note text, p_items jsonb)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_order_id uuid;
  v_total    numeric(10, 2) := 0;
  v_item     jsonb;
  v_menu_id  uuid;
  v_qty      integer;
  v_price    numeric(10, 2);
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
    v_menu_id := (v_item ->> 'menu_id')::uuid;
    v_qty     := (v_item ->> 'quantity')::integer;

    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity for menu %', v_menu_id;
    end if;

    -- Trust the database, not the client, for the price.
    select price into v_price
    from public.menus
    where id = v_menu_id and is_available = true;

    if v_price is null then
      raise exception 'Menu % not found or unavailable', v_menu_id;
    end if;

    insert into public.order_items (order_id, menu_id, quantity, price)
    values (v_order_id, v_menu_id, v_qty, v_price);

    v_total := v_total + v_price * v_qty;
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.create_order(text, jsonb) to authenticated;

-- ---------- Demo menu seed ----------

insert into public.menus (name, price, category) values
  ('ชาไข่มุก',    35, 'เครื่องดื่ม'),
  ('ราดหน้า',     60, 'อาหาร'),
  ('ผัดไทย',      60, 'อาหาร'),
  ('ข้าวผัด',     55, 'อาหาร'),
  ('ส้มตำ',       50, 'อาหาร'),
  ('น้ำเต้าหู้',   25, 'เครื่องดื่ม'),
  ('ชาเย็น',      30, 'เครื่องดื่ม'),
  ('กาแฟเย็น',    35, 'เครื่องดื่ม')
on conflict (name) do nothing;
