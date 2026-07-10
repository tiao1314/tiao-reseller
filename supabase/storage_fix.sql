-- ============================================================
--  dripdrip — fix image uploads ("row violates row-level security policy")
--  Run in Supabase → SQL Editor.
--
--  Image uploads only work for a registered admin. This (1) makes sure YOUR
--  account is an admin, and (2) re-applies the storage policies for the
--  product-images bucket. Safe to re-run.
--
--  ⚠️ If you log into the admin panel with a different email, change it below.
-- ============================================================

-- 1) Make sure you are a registered admin (needed for uploads AND panel access)
insert into public.admins (user_id)
  select id from auth.users where email = lower('1314tiao@gmail.com')
  on conflict do nothing;

-- 2) Make sure the bucket exists and is publicly readable
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do update set public = true;

-- 3) (Re)create the storage policies for that bucket
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin change product images" on storage.objects;
create policy "admin change product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin remove product images" on storage.objects;
create policy "admin remove product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- Check you're now an admin (should return your email):
-- select u.email from public.admins a join auth.users u on u.id = a.user_id;
