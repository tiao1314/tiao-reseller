-- ============================================================
--  dripdrip — email the customer when their order status changes
--  Run in Supabase → SQL Editor. When you move an order to Accepted / Shipped /
--  Delivered / Declined in the admin, this POSTs the row to the status-email
--  Edge Function, which sends a short update email.
--  (Requires: the status-email function deployed with "Verify JWT" OFF.)
-- ============================================================

create extension if not exists pg_net;

create or replace function public.on_order_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url     := 'https://lnzhsjzwqungawuzqfzt.supabase.co/functions/v1/status-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxuemhzanp3cXVuZ2F3dXpxZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjg2ODEsImV4cCI6MjA5ODk0NDY4MX0.PZETP8oPRUzj8M_rQ91R0hpx3BOxZJsugXlepe9u9Ng'
    ),
    body    := jsonb_build_object('record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

-- Fires only when the status column actually changes (not on tracking edits etc).
drop trigger if exists trg_status_email on public.orders;
create trigger trg_status_email
  after update of status on public.orders
  for each row
  when (OLD.status is distinct from NEW.status)
  execute function public.on_order_status_change();
