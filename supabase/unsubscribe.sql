-- ============================================================
--  dripdrip — add a per-subscriber unsubscribe token
--  Run in Supabase → SQL Editor (after subscribers.sql).
--  Each subscriber gets a random token; the newsletter footer links to the
--  `unsubscribe` Edge Function with that token, which removes them. Using a
--  token (not the raw email) stops anyone unsubscribing someone else.
-- ============================================================

create extension if not exists pgcrypto;

alter table public.subscribers
  add column if not exists unsub_token uuid not null default gen_random_uuid();

notify pgrst, 'reload schema';
