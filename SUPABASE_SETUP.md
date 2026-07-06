# tiao — Orders backend, admin panel & WhatsApp notifications

No payment. Customers **request** an order → you review it in a private **admin
panel** (accept/decline, add tracking, track status) → a **WhatsApp message** hits
your group the moment a request comes in. Profit is tracked with private cost
prices.

```
Customer: browse → cart → Request Order (name + contact, no payment)
      │  saved to Supabase (orders table)
      ▼
WhatsApp group:  "🛍️ New tiao order request! Thanks {client} …"
      ▼
You: admin.html → review → Accept / Decline → add tracking → Shipped/Delivered
      ▼
Dashboard: revenue, profit (sale − your cost), orders, average order value
```

The site stays on **GitHub Pages** — Supabase is the database + login, and its
row-level security means the public anon key is safe to ship in the browser.

---

## 1. Create the Supabase project
1. https://supabase.com → **New project** (free tier). Pick a region near you.
2. **Project Settings → API** → copy:
   - **Project URL**  → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
3. Paste both into [assets/js/config.js](assets/js/config.js). Also set `ADMIN_EMAIL`
   to the email you'll log in with.

## 2. Create the tables
1. Supabase → **SQL Editor → New query**.
2. Paste all of [supabase/schema.sql](supabase/schema.sql) and **Run**.
   This creates `orders` + `product_costs`, locks them down with row-level
   security (anyone can *submit* an order; only you can *read/manage* them), and
   seeds cost prices at a **placeholder 70% of sale price**.
3. **Edit your real buy prices:** Table Editor → `product_costs` → set each `cost`
   to what you actually paid, so profit is accurate.

> Changed the product list in `assets/js/data.js`? Re-run the seed section of
> `schema.sql` (it upserts) and set costs for any new items.

## 3. Create your admin login
1. Supabase → **Authentication → Users → Add user** → your email + a password
   (use the same email as `ADMIN_EMAIL`).
2. Open **`/admin.html`** on your site → sign in. You'll see the dashboard.
   (The page is `noindex` and only readable by a signed-in user.)

## 4. WhatsApp group notifications (CallMeBot)
**On your phone (only you can do this):**
1. Open https://www.callmebot.com/blog/free-api-whatsapp-messages/ and follow the
   **group** instructions: add the CallMeBot number to your WhatsApp group and
   send the activation phrase it gives you.
2. It replies with your **apikey** and the group id/phone to use.

**Deploy the notifier (one-time), using the Supabase CLI:**
```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy notify-order --no-verify-jwt
supabase secrets set CALLMEBOT_PHONE="<group id/phone>" CALLMEBOT_APIKEY="<apikey>"
```
**Fire it on every new order** — Supabase → **Database → Webhooks → Create**:
- Table: `orders`  ·  Events: **Insert**
- Type: **Supabase Edge Function** → `notify-order`

Place a test order on the site → your WhatsApp group should ping. 🎉

> CallMeBot is a free, **unofficial** service — great to start. To go official
> later, swap the `fetch(...)` in
> [supabase/functions/notify-order/index.ts](supabase/functions/notify-order/index.ts)
> for Twilio / WhatsApp Cloud API (they message a number, not a group) or a
> Telegram group bot.

## 5. Go live
Push to GitHub → GitHub Pages serves the updated site. Share the store URL;
keep `/admin.html` for yourself.

---

## What the admin panel does
- **Stat tiles** — Revenue, Profit (with margin), Avg order value, and how many
  requests need review.
- **Revenue & profit chart** — over time, confirmed orders only.
- **Orders table** — customer + contact + note + items, one-click **Accept /
  Decline**, a **status** dropdown (pending → accepted → shipped → delivered),
  and a **tracking link** field customers' couriers (e.g. Evri) plug into.
- **Profit** per order = sale price − your private `cost`. Costs never leave the
  admin (row-level security blocks the public key from reading them).

## Files
| File | Purpose |
|---|---|
| `request.html`, `assets/js/request.js` | Customer order-request page (no payment) |
| `admin.html`, `assets/js/admin.js`, `assets/css/admin.css` | Private admin dashboard |
| `assets/js/db.js` | Shared Supabase client |
| `supabase/schema.sql` | Tables + row-level security + cost seed |
| `supabase/functions/notify-order/index.ts` | WhatsApp-on-new-order (CallMeBot) |
