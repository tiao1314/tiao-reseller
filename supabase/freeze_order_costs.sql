-- ============================================================
--  dripdrip — freeze each order's cost at the time it's placed
--  Run in Supabase → SQL Editor (after schema.sql + accounts.sql + listings.sql).
--
--  Revenue is already frozen (the sell price is saved onto the order). This does
--  the same for COST: when an order is created, we snapshot the total cost from
--  the products table into an admin-only table. The profit chart then uses that
--  frozen value, so changing a product's cost (or price) later never rewrites
--  the profit/loss of past orders.
--
--  Cost is kept in a SEPARATE table (not on the order row / items) so it is
--  never exposed to customers, who can read their own orders.
-- ============================================================

create table if not exists public.order_costs (
  order_id   uuid primary key references public.orders(id) on delete cascade,
  cost_total numeric not null default 0
);

alter table public.order_costs enable row level security;

-- Only admins may read it. The trigger below is security-definer, so it writes
-- regardless of RLS — no insert policy is needed (keeps it locked down).
drop policy if exists "admin read order_costs" on public.order_costs;
create policy "admin read order_costs" on public.order_costs
  for select to authenticated using (public.is_admin());

-- On each new order, total up the current cost of its items and store it.
create or replace function public.snapshot_order_cost()
returns trigger language plpgsql security definer as $$
declare
  it    jsonb;
  c     numeric;
  total numeric := 0;
begin
  for it in select * from jsonb_array_elements(coalesce(NEW.items, '[]'::jsonb)) loop
    select p.cost into c from public.products p where p.id::text = (it->>'id');
    total := total + coalesce(c, 0) * coalesce(nullif(it->>'qty','')::numeric, 1);
  end loop;
  insert into public.order_costs (order_id, cost_total) values (NEW.id, total)
    on conflict (order_id) do update set cost_total = excluded.cost_total;
  return NEW;
end; $$;

drop trigger if exists trg_snapshot_cost on public.orders;
create trigger trg_snapshot_cost
  after insert on public.orders
  for each row execute function public.snapshot_order_cost();

notify pgrst, 'reload schema';
