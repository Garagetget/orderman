-- T28 — RLS defense-in-depth for menu/category writes.
--
-- Before T28, both menus and categories had a single "authenticated full access"
-- policy (for all using(true) with check(true)) — any logged-in user (staff
-- included) could write. The app guard now blocks staff, but RLS is the second
-- line of defense: split the blanket policy so reads stay open to every
-- authenticated user (staff need to read menus on the order page) while
-- INSERT/UPDATE/DELETE require the menu.manage permission, resolved by the T26
-- helper public.auth_has_permission().
--
-- orders / order_items policies are intentionally LEFT UNTOUCHED — orders are
-- created by both owner and staff.
--
-- Idempotent + re-runnable: drop-if-exists before each create.

-- ---------- menus ----------
drop policy if exists "authenticated full access" on public.menus;
drop policy if exists "menus read"   on public.menus;
drop policy if exists "menus insert" on public.menus;
drop policy if exists "menus update" on public.menus;
drop policy if exists "menus delete" on public.menus;

create policy "menus read" on public.menus
  for select to authenticated
  using (true);

create policy "menus insert" on public.menus
  for insert to authenticated
  with check (public.auth_has_permission('menu.manage'));

create policy "menus update" on public.menus
  for update to authenticated
  using (public.auth_has_permission('menu.manage'))
  with check (public.auth_has_permission('menu.manage'));

create policy "menus delete" on public.menus
  for delete to authenticated
  using (public.auth_has_permission('menu.manage'));

-- ---------- categories ----------
drop policy if exists "authenticated full access" on public.categories;
drop policy if exists "categories read"   on public.categories;
drop policy if exists "categories insert" on public.categories;
drop policy if exists "categories update" on public.categories;
drop policy if exists "categories delete" on public.categories;

create policy "categories read" on public.categories
  for select to authenticated
  using (true);

create policy "categories insert" on public.categories
  for insert to authenticated
  with check (public.auth_has_permission('menu.manage'));

create policy "categories update" on public.categories
  for update to authenticated
  using (public.auth_has_permission('menu.manage'))
  with check (public.auth_has_permission('menu.manage'));

create policy "categories delete" on public.categories
  for delete to authenticated
  using (public.auth_has_permission('menu.manage'));
