# tiao — Payments + WhatsApp order notifications

This adds **PayPal checkout** and a **WhatsApp-group notification** that fires
automatically after a **verified** payment ("Thanks {client} for purchasing …").

## How it works (why it's safe)

```
Customer clicks Pay
        │
        ▼
create-order  (serverless)  ── computes the total from catalog.json, so the
        │                       amount can NEVER be tampered with in the browser
        ▼
Customer approves in PayPal
        │
        ▼
capture-order (serverless)  ── captures the payment, and ONLY on a successful
        │                       capture sends the WhatsApp message via CallMeBot
        ▼
WhatsApp group gets:  "🛍️ New tiao order! Thanks {name} for purchasing …"
```

Secrets (PayPal secret, CallMeBot key) live **only** in Netlify environment
variables — never in the browser, never in git.

---

## 1. Deploy the site to Netlify (hosts site + functions)

1. Go to https://app.netlify.com → **Add new site → Import an existing project**.
2. Connect GitHub and pick **tiao1314/tiao-reseller**.
3. Build command: *(leave blank)*  ·  Publish directory: `.`  ·  Functions: `netlify/functions` (auto-detected from `netlify.toml`).
4. Deploy. You'll get a URL like `https://tiao.netlify.app`.

> You can keep the GitHub Pages site for browsing, but **checkout only works on
> the Netlify URL** because that's where the serverless functions run.

## 2. PayPal credentials

1. https://developer.paypal.com → **Apps & Credentials**.
2. Start in **Sandbox** to test, then switch to **Live**.
3. Create an app → copy the **Client ID** and **Secret**.
4. Put the **Client ID** (public) in `assets/js/config.js` → `PAYPAL_CLIENT_ID`.
5. In Netlify → **Site settings → Environment variables**, add:
   - `PAYPAL_CLIENT_ID` = your client id
   - `PAYPAL_SECRET` = your secret
   - `PAYPAL_ENV` = `sandbox` (change to `live` when ready)
   - `PAYPAL_CURRENCY` = `GBP`

## 3. CallMeBot WhatsApp group notification

1. Read https://www.callmebot.com/blog/free-api-whatsapp-messages/ (the "group" section).
2. **Add the CallMeBot number to your WhatsApp group** and send the activation
   message it asks for. It replies with your **apikey** (and the group id/phone to use).
3. In Netlify → Environment variables, add:
   - `CALLMEBOT_PHONE` = the group id / phone CallMeBot gives you
   - `CALLMEBOT_APIKEY` = your apikey

> CallMeBot is a free, **unofficial** service — great for a small store. If you
> later want an official, rock-solid channel, swap `notifyWhatsApp()` in
> `netlify/functions/capture-order.js` for Twilio or the WhatsApp Cloud API
> (those send to a number, not a group), or a Telegram group bot.

## 4. Test end to end

1. With `PAYPAL_ENV=sandbox`, open your Netlify site, add a product, go to Checkout.
2. Pay with a **PayPal sandbox buyer account** (create one under Sandbox → Accounts).
3. On success you'll see the confirmation screen **and** your WhatsApp group
   should receive the "New tiao order!" message.
4. When happy, set `PAYPAL_ENV=live` and use your live PayPal Client ID/Secret.

## Local testing (optional)

```bash
npm i -g netlify-cli
netlify dev            # runs the site + functions locally with your .env
```
Create a local `.env` from `.env.example` (it's git-ignored).

## Files added
- `checkout.html`, `assets/js/checkout.js` — checkout page + PayPal buttons
- `netlify/functions/create-order.js` — creates the order (server-side total)
- `netlify/functions/capture-order.js` — captures payment + sends WhatsApp
- `netlify/functions/catalog.json` — server-side price list (regenerate if you
  change `assets/js/data.js`)
- `netlify.toml`, `.env.example`
