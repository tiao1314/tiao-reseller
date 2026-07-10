-- ============================================================
--  dripdrip — add a delivery address to orders
--  Run in Supabase → SQL Editor. Adds address fields the request form now
--  collects, so you can see exactly where each order ships. Safe to re-run.
-- ============================================================

alter table public.orders
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city         text,
  add column if not exists postcode     text,
  add column if not exists country      text;

notify pgrst, 'reload schema';
