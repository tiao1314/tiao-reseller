-- ============================================================
--  tiao — Supabase schema (orders + private product costs)
--  Run this in Supabase → SQL Editor → New query → Run.
-- ============================================================

-- 1) ORDERS ---------------------------------------------------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  customer_name  text not null,
  customer_email text not null,
  customer_phone text,
  note          text,
  items         jsonb not null,            -- [{id,brand,name,price}, ...]
  subtotal      numeric not null default 0,
  status        text not null default 'pending',  -- pending|accepted|declined|shipped|delivered
  tracking_url  text,
  admin_note    text
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

-- 2) PRIVATE PRODUCT COSTS (admin-only, powers profit) --------
create table if not exists public.product_costs (
  product_id text primary key,
  brand      text,
  name       text,
  price      numeric,      -- sale price (reference)
  cost       numeric       -- what YOU paid (private)
);

-- 3) ROW LEVEL SECURITY --------------------------------------
alter table public.orders         enable row level security;
alter table public.product_costs  enable row level security;

-- Anyone (anon) may CREATE an order request...
drop policy if exists "anon can insert orders" on public.orders;
create policy "anon can insert orders"
  on public.orders for insert
  to anon, authenticated
  with check (true);

-- ...but only signed-in admins may READ / UPDATE / DELETE them.
drop policy if exists "admin can read orders" on public.orders;
create policy "admin can read orders"
  on public.orders for select
  to authenticated using (true);

drop policy if exists "admin can update orders" on public.orders;
create policy "admin can update orders"
  on public.orders for update
  to authenticated using (true) with check (true);

drop policy if exists "admin can delete orders" on public.orders;
create policy "admin can delete orders"
  on public.orders for delete
  to authenticated using (true);

-- Costs are fully private: only signed-in admins can touch them.
drop policy if exists "admin only costs" on public.product_costs;
create policy "admin only costs"
  on public.product_costs for all
  to authenticated using (true) with check (true);

-- 4) SEED COST TABLE (placeholder cost = 70% of price) --------
--    EDIT these to your real buy prices so profit is accurate.
insert into public.product_costs (product_id, brand, name, price, cost) values
  ('b1', 'SAINT LAURENT', 'Loulou Medium Quilted Leather', 1980, 1386),
  ('b2', 'CHANEL', 'Classic Flap Medium Caviar', 8900, 6230),
  ('b3', 'OFF-WHITE', 'Binder Clip Jitney Bag', 1240, 868),
  ('b4', 'LOUIS VUITTON', 'Neverfull MM Monogram Tote', 1650, 1155),
  ('b5', 'DIOR', 'Saddle Bag Oblique Canvas', 2450, 1715),
  ('b6', 'HERMÈS', 'Kelly 28 Togo Leather', 21500, 15050),
  ('b7', 'GUCCI', 'GG Marmont Small Shoulder', 1290, 903),
  ('b8', 'PRADA', 'Re-Edition 2005 Nylon', 1150, 805),
  ('b9', 'BOTTEGA VENETA', 'Jodie Mini Intrecciato', 2680, 1876),
  ('b10', 'BALENCIAGA', 'Hourglass Small Top Handle', 1990, 1393),
  ('s1', 'NIKE × OFF-WHITE', 'Air Jordan 1 "The Ten"', 2200, 1540),
  ('s2', 'BALENCIAGA', 'Triple S Trainers Grey', 720, 504),
  ('s3', 'YEEZY', 'Boost 350 V2 "Zebra"', 340, 238),
  ('s4', 'DIOR', 'B23 High-Top Oblique', 980, 686),
  ('s5', 'CHRISTIAN LOUBOUTIN', 'So Kate 120 Patent', 640, 448),
  ('s6', 'NIKE', 'Dunk Low "Panda"', 180, 126),
  ('s7', 'NEW BALANCE', '550 White Green', 210, 147),
  ('s8', 'GUCCI', 'Rhyton Logo Leather', 720, 504),
  ('w1', 'ROLEX', 'Datejust 41 Oyster Steel', 9850, 6895),
  ('w2', 'AUDEMARS PIGUET', 'Royal Oak 41 Steel', 42500, 29750),
  ('w3', 'PATEK PHILIPPE', 'Nautilus 5711 Blue Dial', 98000, 68600),
  ('w4', 'OMEGA', 'Speedmaster Moonwatch', 5400, 3780),
  ('w5', 'CARTIER', 'Santos Medium Steel', 6200, 4340),
  ('w6', 'ROLEX', 'Submariner Date Black', 14200, 9940),
  ('a1', 'GUCCI', 'GG Marmont Leather Belt', 420, 294),
  ('a2', 'SAINT LAURENT', 'Monogram Cardholder', 260, 182),
  ('a3', 'CHANEL', 'CC Logo Sunglasses', 540, 378),
  ('a4', 'HERMÈS', 'Silk Twill Scarf 90cm', 480, 336),
  ('a5', 'LOUIS VUITTON', 'Monogram Bracelet', 390, 273),
  ('a6', 'DIOR', 'CD Icon Baseball Cap', 380, 266)
on conflict (product_id) do update
  set price = excluded.price, brand = excluded.brand, name = excluded.name;

-- 5) REALTIME: let the hermes listener receive new orders ------
--    Adds the orders table to Supabase's realtime publication so an
--    INSERT is streamed to the listener running on your server.
alter publication supabase_realtime add table public.orders;

-- ============================================================
--  Alerts: the hermes/ listener subscribes to the above realtime
--  stream and notifies you on every new order. See hermes/README.md
--  and SUPABASE_SETUP.md.
-- ============================================================
