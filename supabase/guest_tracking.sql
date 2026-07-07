-- ============================================================
--  tiao — guest order tracking
--  Run in Supabase → SQL Editor (after schema.sql + accounts.sql).
--
--  Lets shoppers who checked out WITHOUT an account track their order
--  using a reference code + their email. Secure: the lookup returns an
--  order ONLY when BOTH the reference and the email match.
-- ============================================================

-- Reference code stored on each order (the browser generates it and shows
-- it to the customer at checkout).
alter table public.orders add column if not exists ref_code text;
create index if not exists orders_ref_idx on public.orders (ref_code);

-- Public, safe lookup. security definer lets it read past RLS, but it only
-- ever returns the single row whose ref_code AND email both match.
create or replace function public.track_order(p_ref text, p_email text)
returns table (status text, tracking_url text, created_at timestamptz, subtotal numeric, items jsonb)
language sql
security definer
stable
as $$
  select o.status, o.tracking_url, o.created_at, o.subtotal, o.items
  from public.orders o
  where upper(o.ref_code) = upper(trim(p_ref))
    and lower(o.customer_email) = lower(trim(p_email))
  order by o.created_at desc
  limit 1;
$$;

grant execute on function public.track_order(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
