-- Manual order lines (T17): let staff add an off-menu item by typing a name +
-- price, e.g. a one-off special or a customer's own request.
--
-- order_items.menu_id was a NOT NULL FK. We make it nullable and add
-- custom_name so a line is EITHER a menu line (menu_id set, name looked up from
-- menus) OR a manual line (menu_id null, custom_name set). A CHECK enforces the
-- XOR and forbids พิเศษ on manual lines (no surcharge source to apply).
--
-- Price for a manual line necessarily comes from the client (no menus row to
-- snapshot), so create_order() validates it is a non-negative number. Menu
-- lines keep their server-side price snapshot — the client price is never
-- trusted for them.
-- Idempotent.

alter table public.order_items alter column menu_id drop not null;

alter table public.order_items
  add column if not exists custom_name text;

alter table public.order_items
  drop constraint if exists order_items_line_kind_check;
alter table public.order_items
  add constraint order_items_line_kind_check check (
    (menu_id is not null and custom_name is null)
    or (menu_id is null and custom_name is not null
        and btrim(custom_name) <> '' and is_special = false)
  );

-- ---------- create_order() — now accepts manual lines ----------
-- p_items: jsonb array of objects, each one of:
--   menu line:   { "menu_id": <uuid>, "quantity": <int>, "is_special": <bool?> }
--   manual line: { "custom_name": <text>, "price": <num>, "quantity": <int> }

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
  v_name       text;
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
    v_menu_id := nullif(v_item ->> 'menu_id', '')::uuid;
    v_qty     := (v_item ->> 'quantity')::integer;

    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity';
    end if;

    if v_menu_id is null then
      -- Manual (off-menu) line: name + price come from the client.
      v_name := btrim(coalesce(v_item ->> 'custom_name', ''));
      if v_name = '' then
        raise exception 'Manual item requires a name';
      end if;

      v_price := (v_item ->> 'price')::numeric;
      if v_price is null or v_price < 0 then
        raise exception 'Invalid price for manual item';
      end if;

      insert into public.order_items
        (order_id, menu_id, custom_name, quantity, price, is_special)
      values (v_order_id, null, v_name, v_qty, v_price, false);

      v_total := v_total + v_price * v_qty;
    else
      -- Menu line: trust the database, not the client, for price + surcharge.
      v_is_special := coalesce((v_item ->> 'is_special')::boolean, false);

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

      insert into public.order_items
        (order_id, menu_id, custom_name, quantity, price, is_special)
      values (v_order_id, v_menu_id, null, v_qty, v_price, v_is_special);

      v_total := v_total + v_price * v_qty;
    end if;
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.create_order(text, jsonb) to authenticated;
