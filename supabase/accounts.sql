-- ============================================================
--  tiao — customer accounts migration
--  Run AFTER schema.sql, in Supabase → SQL Editor.
--
--  Adds customer accounts: orders link to the account that placed them,
--  customers can see ONLY their own orders, and the admin (you) sees all.
--
--  ⚠️ BEFORE RUNNING: replace the email on the marked line below with the
--     email of YOUR admin user (the one you log into dd-ops-k7f29x.html with).
-- ============================================================

-- 1) Link orders to the account that created them ------------
alter table public.orders add column if not exists user_id uuid;

-- Stamp the logged-in user's id on insert (secure — set server-side, so it
-- can't be spoofed by the browser). Guests (not logged in) get null.
create or replace function public.set_order_user() returns trigger as $$
begin
  new.user_id := auth.uid();
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists trg_set_order_user on public.orders;
create trigger trg_set_order_user before insert on public.orders
  for each row execute function public.set_order_user();

-- 2) Who is an admin? ----------------------------------------
create table if not exists public.admins (user_id uuid primary key);
alter table public.admins enable row level security;   -- no policies: API can't touch it

create or replace function public.is_admin() returns boolean as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$ language sql security definer stable;

-- >>> EDIT THIS EMAIL to your admin account's email, then it self-registers:
insert into public.admins (user_id)
  select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
  on conflict do nothing;

-- 3) Rebuild orders policies ---------------------------------
--    INSERT: anyone (guest or logged in) may create a request.
drop policy if exists "anon can insert orders"   on public.orders;
drop policy if exists "public can insert orders" on public.orders;
create policy "public can insert orders" on public.orders
  for insert to public with check (true);

--    SELECT: admin sees all; customers see only their own.
drop policy if exists "admin can read orders"     on public.orders;
drop policy if exists "admin read all orders"      on public.orders;
drop policy if exists "customers read own orders"  on public.orders;
create policy "admin read all orders" on public.orders
  for select to authenticated using (public.is_admin());
create policy "customers read own orders" on public.orders
  for select to authenticated using (user_id = auth.uid());

--    UPDATE / DELETE: admin only.
drop policy if exists "admin can update orders" on public.orders;
drop policy if exists "admin update orders"     on public.orders;
create policy "admin update orders" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin can delete orders" on public.orders;
drop policy if exists "admin delete orders"     on public.orders;
create policy "admin delete orders" on public.orders
  for delete to authenticated using (public.is_admin());

-- 4) Lock private costs to admin only ------------------------
drop policy if exists "admin only costs" on public.product_costs;
create policy "admin only costs" on public.product_costs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5) Refresh the API so the new policies take effect immediately
notify pgrst, 'reload schema';

-- Done. Verify: this should return true when you are logged in as admin,
-- and false / no rows for a normal customer.
-- select public.is_admin();
