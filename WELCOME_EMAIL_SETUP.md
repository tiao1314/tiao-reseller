# dripdrip — subscriber welcome email (Resend + Supabase)

Sends "Thanks for subscribing" from **hello@dripdrip.store** whenever someone
joins the newsletter. Runs entirely inside Supabase — no server needed.

## 1. Verify your domain in Resend (so you can send from @dripdrip.store)
1. Resend → **Domains → Add Domain** → `dripdrip.store`.
2. Resend shows a handful of **DNS records** (SPF `TXT`, DKIM records, and a
   return-path/MX). In **GoDaddy → Manage DNS**, add each record exactly as
   shown (Type / Name / Value). Leave your existing GitHub A records + www CNAME
   alone — just add the new ones Resend gives you.
3. Back in Resend, wait until the domain shows **Verified** (usually minutes).

> Want to test before the domain verifies? Temporarily set `WELCOME_FROM` to
> `onboarding@resend.dev` — but that can only email *your own* Resend account
> address until the domain is verified.

## 2. Create the Edge Function in Supabase
**Dashboard way (no CLI):**
1. Supabase → **Edge Functions → Create a new function** → name it `welcome-email`.
2. Paste the contents of [supabase/functions/welcome-email/index.ts](supabase/functions/welcome-email/index.ts).
3. **Turn OFF "Verify JWT"** for this function (the webhook calls it without a user token).
4. **Deploy**.

**CLI way (alternative):**
```bash
npm i -g supabase && supabase login
supabase link --project-ref lnzhsjzwqungawuzqfzt
supabase functions deploy welcome-email --no-verify-jwt
```

## 3. Add your secrets
Supabase → **Edge Functions → (welcome-email) → Secrets** (or Project Settings →
Edge Functions), add:
- `RESEND_API_KEY` = your Resend key
- `WELCOME_FROM` = `dripdrip <hello@dripdrip.store>`

(CLI: `supabase secrets set RESEND_API_KEY=... WELCOME_FROM="dripdrip <hello@dripdrip.store>"`)

## 4. Trigger it on new subscribers
Supabase → **Database → Webhooks → Create a new hook**:
- Name: `on-subscribe`
- Table: **subscribers** · Events: **Insert**
- Type: **Supabase Edge Functions** → choose **welcome-email**
- Method POST (default). Save.

## 5. Test
Make sure [supabase/subscribers.sql](supabase/subscribers.sql) has been run, then
subscribe with a real email on the homepage. You should get the welcome email
within seconds. If not, check the function's **Logs** in Supabase (it returns the
Resend status/message there).

> This replaces the hermes welcome-email path — you don't need `RESEND_API_KEY`
> in `hermes/.env`. hermes still handles WhatsApp order alerts.
