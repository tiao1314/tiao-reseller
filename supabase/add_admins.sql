-- ============================================================
--  tiao — register additional admins
--  Run in Supabase → SQL Editor (after accounts.sql).
--
--  Any email listed here (that has a user in Authentication → Users)
--  becomes an admin: sees all orders, private costs, and can manage
--  listings. Add or remove emails, then Run. Safe to re-run.
-- ============================================================

insert into public.admins (user_id)
  select id from auth.users
  where email in (
    '1314tiao@gmail.com',          -- you
    'SECOND_ADMIN@example.com',    -- <-- replace with your 2nd admin's email
    'THIRD_ADMIN@example.com'      -- <-- replace with your 3rd admin's email
  )
  on conflict do nothing;

-- Check who is now an admin:
-- select u.email from public.admins a join auth.users u on u.id = a.user_id;
