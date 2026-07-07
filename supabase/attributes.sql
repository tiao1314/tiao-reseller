-- ============================================================
--  dripdrip — product attributes (gender / size / colour)
--  Run in Supabase → SQL Editor (after listings.sql).
--  Adds the columns the storefront filters use, exposes them in the
--  public view, and backfills your seeded bags & shoes.
-- ============================================================

alter table public.products add column if not exists gender text default '';
alter table public.products add column if not exists sizes  text default '';   -- comma-separated, e.g. 'UK 8, UK 9'
alter table public.products add column if not exists colors text default '';   -- comma-separated, e.g. 'Black, Brown'

-- rebuild the public view to include the new columns
create or replace view public.products_public as
  select id, category, brand, name, price, condition, badge, is_new, img,
         gender, sizes, colors, sort_order, created_at
  from public.products
  where active;
grant select on public.products_public to anon, authenticated;

-- backfill existing bags & shoes
update public.products set gender='Women', sizes='Medium', colors='Black' where id='b1';
update public.products set gender='Women', sizes='Medium', colors='Black' where id='b2';
update public.products set gender='Unisex', sizes='Small', colors='Black' where id='b3';
update public.products set gender='Women', sizes='Large', colors='Brown' where id='b4';
update public.products set gender='Women', sizes='Medium', colors='Blue' where id='b5';
update public.products set gender='Women', sizes='Medium', colors='Black' where id='b6';
update public.products set gender='Women', sizes='Small', colors='Black' where id='b7';
update public.products set gender='Women', sizes='Small', colors='Black' where id='b8';
update public.products set gender='Women', sizes='Mini', colors='Green' where id='b9';
update public.products set gender='Women', sizes='Small', colors='White' where id='b10';
update public.products set gender='Unisex', sizes='UK 7, UK 8, UK 9, UK 10', colors='White, Black, Red' where id='s1';
update public.products set gender='Unisex', sizes='UK 8, UK 9, UK 10', colors='Grey' where id='s2';
update public.products set gender='Unisex', sizes='UK 7, UK 8, UK 9', colors='White' where id='s3';
update public.products set gender='Men', sizes='UK 8, UK 9, UK 10', colors='White' where id='s4';
update public.products set gender='Women', sizes='UK 4, UK 5, UK 6', colors='Black' where id='s5';
update public.products set gender='Unisex', sizes='UK 6, UK 7, UK 8, UK 9', colors='White, Black' where id='s6';
update public.products set gender='Unisex', sizes='UK 7, UK 8, UK 9', colors='White, Green' where id='s7';
update public.products set gender='Men', sizes='UK 8, UK 9', colors='White' where id='s8';
notify pgrst, 'reload schema';
