-- Collapse the "เพิ่ม"-prefixed duplicates into their unprefixed names so the
-- "ของเพิ่ม" menu reads ขาไก่ / ลูกชิ้น (no "เพิ่ม" prefix).
--
-- Some databases ended up with BOTH names (an earlier seed inserted the
-- prefixed row next to an already-existing unprefixed one), so a plain rename
-- would violate menus.name's unique constraint. For each pair:
--   - if only the prefixed row exists  → rename it
--   - if both exist                    → repoint its order_items to the twin,
--                                         then delete the prefixed duplicate
--   - otherwise                        → no-op (already correct, e.g. prod)
-- Idempotent and FK-safe.

do $$
declare
  pair      record;
  v_old_id  uuid;
  v_new_id  uuid;
begin
  for pair in
    select * from (values
      ('เพิ่มขาไก่'::text,  'ขาไก่'::text),
      ('เพิ่มลูกชิ้น',       'ลูกชิ้น')
    ) as t(old_name, new_name)
  loop
    select id into v_old_id from public.menus where name = pair.old_name;
    if v_old_id is null then
      continue;
    end if;

    select id into v_new_id from public.menus where name = pair.new_name;
    if v_new_id is null then
      update public.menus set name = pair.new_name where id = v_old_id;
    else
      update public.order_items set menu_id = v_new_id where menu_id = v_old_id;
      delete from public.menus where id = v_old_id;
    end if;
  end loop;
end $$;
