-- ============================================================
--  dripdrip — products: multiple images + all-new condition
--  Run in Supabase → SQL Editor (after listings.sql + attributes.sql).
-- ============================================================

-- 1) multi-image support (comma-separated URLs; first = cover)
alter table public.products add column if not exists images text default '';

-- 2) rebuild the public view to expose `images`
drop view if exists public.products_public;
create view public.products_public as
  select id, category, brand, name, price, condition, badge, is_new, img, images,
         gender, sizes, colors, sort_order, created_at
  from public.products
  where active;
grant select on public.products_public to anon, authenticated;

-- 3) everything is Brand New — drop any "Pre-Owned" wording
update public.products
  set condition = 'Brand New · Boxed'
  where condition ilike '%pre-owned%' or condition ilike '%pre owned%';

-- 4) seed the existing single image into the images list (so cards have a cover)
update public.products
  set images = img
  where (images is null or images = '') and img is not null and img <> '';

notify pgrst, 'reload schema';
