-- ============================================================
--  dripdrip — call the welcome-email Edge Function on new subscriber
--  Run in Supabase → SQL Editor. This is the same thing the "Database
--  Webhooks" UI does, created directly so you don't need to find that page.
--  (Requires: subscribers table exists, and the welcome-email function is
--   deployed with "Verify JWT" OFF.)
-- ============================================================

create extension if not exists pg_net;

create or replace function public.on_new_subscriber()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url     := 'https://lnzhsjzwqungawuzqfzt.supabase.co/functions/v1/welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxuemhzanp3cXVuZ2F3dXpxZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjg2ODEsImV4cCI6MjA5ODk0NDY4MX0.PZETP8oPRUzj8M_rQ91R0hpx3BOxZJsugXlepe9u9Ng'
    ),
    body    := jsonb_build_object('record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

drop trigger if exists trg_welcome_email on public.subscribers;
create trigger trg_welcome_email
  after insert on public.subscribers
  for each row execute function public.on_new_subscriber();
