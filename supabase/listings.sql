-- ============================================================
--  tiao — product listings (DB-driven catalogue + image storage)
--  Run in Supabase → SQL Editor (after schema.sql + accounts.sql).
--
--  Moves your catalogue into the database so you can add/edit/remove
--  listings (with photo uploads) from the admin panel. The storefront
--  reads a public VIEW that never exposes your private cost.
-- ============================================================

-- 1) Products table (includes private cost) ------------------
create table if not exists public.products (
  id          text primary key default gen_random_uuid()::text,
  category    text not null,
  brand       text not null,
  name        text not null,
  price       numeric not null default 0,
  cost        numeric not null default 0,     -- private (never in the public view)
  condition   text default 'Pre-Owned · Excellent',
  badge       text default 'ON HAND',
  is_new      boolean default false,
  img         text,
  active      boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

alter table public.products enable row level security;

-- Only admins can read/write the raw table (which includes cost).
drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2) Public view — safe columns of ACTIVE products only, no cost.
--    A normal view runs with the owner's rights, so it serves the
--    storefront while the base table stays admin-only.
create or replace view public.products_public as
  select id, category, brand, name, price, condition, badge, is_new, img, sort_order, created_at
  from public.products
  where active;
grant select on public.products_public to anon, authenticated;

-- 3) Image storage bucket ------------------------------------
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin change product images" on storage.objects;
create policy "admin change product images" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin remove product images" on storage.objects;
create policy "admin remove product images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- 4) Seed your current 30 products (cost = 70% placeholder; edit anytime) ---
insert into public.products (id, category, brand, name, price, cost, condition, badge, is_new, img, sort_order) values
  ('b1','bags','SAINT LAURENT','Loulou Medium Quilted Leather',1980,1386,'Pre-Owned · Excellent','ON HAND',false,'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',0),
  ('b2','bags','CHANEL','Classic Flap Medium Caviar',8900,6230,'Pre-Owned · Excellent','AUTHENTICATED',false,'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=600&q=80',1),
  ('b3','bags','OFF-WHITE','Binder Clip Jitney Bag',1240,868,'Brand New · Boxed','NEW IN',true,'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=600&q=80',2),
  ('b4','bags','LOUIS VUITTON','Neverfull MM Monogram Tote',1650,1155,'Pre-Owned · Very Good','ON HAND',false,'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80',3),
  ('b5','bags','DIOR','Saddle Bag Oblique Canvas',2450,1715,'Pre-Owned · Very Good','ON HAND',false,'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=600&q=80',4),
  ('b6','bags','HERMÈS','Kelly 28 Togo Leather',21500,15050,'Pre-Owned · Pristine','AUTHENTICATED',false,'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=600&q=80',5),
  ('b7','bags','GUCCI','GG Marmont Small Shoulder',1290,903,'Brand New · Boxed','NEW IN',true,'https://images.unsplash.com/photo-1601369447149-9b6a0b0b1a52?auto=format&fit=crop&w=600&q=80',6),
  ('b8','bags','PRADA','Re-Edition 2005 Nylon',1150,805,'Pre-Owned · Excellent','ON HAND',false,'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=600&q=80',7),
  ('b9','bags','BOTTEGA VENETA','Jodie Mini Intrecciato',2680,1876,'Brand New · Boxed','NEW IN',true,'https://images.unsplash.com/photo-1614179689702-355944cd0918?auto=format&fit=crop&w=600&q=80',8),
  ('b10','bags','BALENCIAGA','Hourglass Small Top Handle',1990,1393,'Pre-Owned · Excellent','ON HAND',false,'https://images.unsplash.com/photo-1591348122449-02525d70379b?auto=format&fit=crop&w=600&q=80',9),
  ('s1','shoes','NIKE × OFF-WHITE','Air Jordan 1 "The Ten"',2200,1540,'Brand New · Boxed','NEW IN',true,'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80',10),
  ('s2','shoes','BALENCIAGA','Triple S Trainers Grey',720,504,'Brand New · Boxed','ON HAND',false,'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=600&q=80',11),
  ('s3','shoes','YEEZY','Boost 350 V2 "Zebra"',340,238,'Brand New · Boxed','ON HAND',false,'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=600&q=80',12),
  ('s4','shoes','DIOR','B23 High-Top Oblique',980,686,'Pre-Owned · Excellent','ON HAND',false,'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80',13),
  ('s5','shoes','CHRISTIAN LOUBOUTIN','So Kate 120 Patent',640,448,'Pre-Owned · Very Good','ON HAND',false,'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80',14),
  ('s6','shoes','NIKE','Dunk Low "Panda"',180,126,'Brand New · Boxed','NEW IN',true,'https://images.unsplash.com/photo-1600269452121-4f11c6b8f4a9?auto=format&fit=crop&w=600&q=80',15),
  ('s7','shoes','NEW BALANCE','550 White Green',210,147,'Brand New · Boxed','ON HAND',false,'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=600&q=80',16),
  ('s8','shoes','GUCCI','Rhyton Logo Leather',720,504,'Pre-Owned · Excellent','ON HAND',false,'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80',17),
  ('w1','watches','ROLEX','Datejust 41 Oyster Steel',9850,6895,'Verified · Full Set','AUTHENTICATED',false,'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&w=600&q=80',18),
  ('w2','watches','AUDEMARS PIGUET','Royal Oak 41 Steel',42500,29750,'Verified · Full Set','AUTHENTICATED',false,'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=600&q=80',19),
  ('w3','watches','PATEK PHILIPPE','Nautilus 5711 Blue Dial',98000,68600,'Verified · Full Set','AUTHENTICATED',false,'https://images.unsplash.com/photo-1548171915-e79a380a2a4b?auto=format&fit=crop&w=600&q=80',20),
  ('w4','watches','OMEGA','Speedmaster Moonwatch',5400,3780,'Verified · Full Set','ON HAND',false,'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=600&q=80',21),
  ('w5','watches','CARTIER','Santos Medium Steel',6200,4340,'Pre-Owned · Excellent','ON HAND',false,'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=80',22),
  ('w6','watches','ROLEX','Submariner Date Black',14200,9940,'Verified · Full Set','AUTHENTICATED',false,'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&w=600&q=80',23),
  ('a1','accessories','GUCCI','GG Marmont Leather Belt',420,294,'Brand New · Boxed','NEW IN',true,'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=600&q=80',24),
  ('a2','accessories','SAINT LAURENT','Monogram Cardholder',260,182,'Brand New · Boxed','ON HAND',false,'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80',25),
  ('a3','accessories','CHANEL','CC Logo Sunglasses',540,378,'Pre-Owned · Excellent','ON HAND',false,'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',26),
  ('a4','accessories','HERMÈS','Silk Twill Scarf 90cm',480,336,'Brand New · Boxed','NEW IN',true,'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=600&q=80',27),
  ('a5','accessories','LOUIS VUITTON','Monogram Bracelet',390,273,'Pre-Owned · Very Good','ON HAND',false,'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=600&q=80',28),
  ('a6','accessories','DIOR','CD Icon Baseball Cap',380,266,'Brand New · Boxed','ON HAND',false,'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=600&q=80',29)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
