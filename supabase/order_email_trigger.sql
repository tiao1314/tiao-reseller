-- ============================================================
--  dripdrip — email the customer their reference when an order is placed
--  Run in Supabase → SQL Editor. Same idea as welcome_trigger.sql: on a new
--  order, POST the row to the order-email Edge Function, which sends the
--  confirmation email (with the DRIP-XXXXXX reference) via Resend.
--  (Requires: orders table, and the order-email function deployed with
--   "Verify JWT" OFF.)
-- ============================================================

create extension if not exists pg_net;

create or replace function public.on_new_order()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url     := 'https://lnzhsjzwqungawuzqfzt.supabase.co/functions/v1/order-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxuemhzanp3cXVuZ2F3dXpxZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjg2ODEsImV4cCI6MjA5ODk0NDY4MX0.PZETP8oPRUzj8M_rQ91R0hpx3BOxZJsugXlepe9u9Ng'
    ),
    body    := jsonb_build_object('record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

drop trigger if exists trg_order_email on public.orders;
create trigger trg_order_email
  after insert on public.orders
  for each row execute function public.on_new_order();
