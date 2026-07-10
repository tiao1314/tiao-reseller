-- ============================================================
--  dripdrip — manage who can use the admin panel
--  Run snippets in Supabase → SQL Editor. Safe to re-run.
--
--  An admin = a Supabase Auth user (email + password) whose id is in the
--  public.admins table. Creating the login is done in the dashboard
--  (Authentication → Users → Add user); these snippets grant/revoke admin.
-- ============================================================

-- 1) SEE who is currently an admin -----------------------------
select u.email, a.user_id
from public.admins a
join auth.users u on u.id = a.user_id
order by u.email;

-- 2) ADD an admin (the email must already exist in Authentication → Users) ---
--    Replace the email, then run.
insert into public.admins (user_id)
  select id from auth.users where email = lower('NEW_ADMIN@example.com')
  on conflict do nothing;

-- 3) REMOVE an admin (revokes their access to orders/costs) ------
--    They can still log in but will see no data. Replace the email, then run.
-- delete from public.admins
--   where user_id = (select id from auth.users where email = lower('OLD_ADMIN@example.com'));
