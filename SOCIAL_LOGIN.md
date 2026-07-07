# tiao — Google & Discord sign-in

The "Continue with Google / Discord" buttons are built into the login modal.
To switch them on you enable each provider in Supabase and add your site to the
allowed redirect list. ~10 minutes total.

## 1. Add your site to Supabase's redirect allowlist (required for both)
Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://tiao1314.github.io/tiao-reseller/`
- **Redirect URLs → Add:** `https://tiao1314.github.io/tiao-reseller/**`
  (the `**` lets shoppers return to whichever page they signed in from)

Without this, social login will bounce back with a "redirect not allowed" error.

## 2. Google
1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID**
   → type **Web application**.
2. Under **Authorized redirect URIs** add:
   `https://lnzhsjzwqungawuzqfzt.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client secret**.
4. Supabase → **Authentication → Providers → Google** → enable → paste the
   Client ID + secret → **Save**.

## 3. Discord
1. https://discord.com/developers/applications → **New Application**.
2. **OAuth2** tab → **Redirects → Add**:
   `https://lnzhsjzwqungawuzqfzt.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client Secret** (OAuth2 → General).
4. Supabase → **Authentication → Providers → Discord** → enable → paste them → **Save**.

## 4. Done
No code changes or redeploy needed. Open the store → **Login** → the Google /
Discord buttons now work: they redirect to the provider, then return the shopper
signed in (their name shows in the header, and orders they place link to that
account). Email/password sign-in keeps working alongside them.

## Notes
- Only enable the providers you want — if you skip Discord, just leave that button
  unused (or tell me to hide it).
- Social sign-ups appear in **Authentication → Users** like any other customer.
  To make one an **admin**, add their email in `supabase/add_admins.sql` and run it.
- The provider callback always points at your **Supabase** URL
  (`…supabase.co/auth/v1/callback`), not your site — Supabase then bounces the
  shopper back to your site. That's expected.
