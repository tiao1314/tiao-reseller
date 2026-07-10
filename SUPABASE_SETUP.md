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
You: dd-ops-k7f29x.html → review → Accept / Decline → add tracking → Shipped/Delivered
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
2. Open **`/dd-ops-k7f29x.html`** on your site → sign in. You'll see the dashboard.
   (The page is `noindex` and only readable by a signed-in user.)

## 4. Order alerts via hermes (your 24/7 server)
Instead of a third-party service, your always-on server (**hermes**) runs a small
listener that subscribes to Supabase in real time and alerts you on every new
order. It connects **outbound only** — no ports to open.

1. Get your **service role** key: Supabase → **Project Settings → API** →
   `service_role` (secret — server-only).
2. Copy the [`hermes/`](hermes/) folder onto hermes and:
   ```bash
   cd hermes
   cp .env.example .env     # add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WHATSAPP_TO
   npm install
   npm start                # first run prints a QR — scan it in WhatsApp → Linked devices
   ```
   Set `WHATSAPP_TO` to your number (e.g. `447700900123`) or a group JID — run
   `npm run wa-groups` to list group JIDs. You link WhatsApp once via QR; the
   session persists in `wa-auth/` (git-ignored).
3. Keep it running 24/7 with pm2 or systemd — see [hermes/README.md](hermes/README.md).
4. WhatsApp is the primary alert; you can also add Discord / ntfy / a webhook /
   a shell command in `.env`. Every order is logged to stdout too, so `pm2 logs`
   is a live feed.

Place a test order on the site → hermes WhatsApps you within a second. 🎉

> Uses **Baileys** (unofficial WhatsApp) — ideal for low-volume alerts and can
> post to a group. For a fully official channel, swap `hermes/whatsapp.js` for
> Meta's WhatsApp Cloud API. Details in [hermes/README.md](hermes/README.md).

> Realtime is enabled on the `orders` table by `schema.sql`
> (`alter publication supabase_realtime add table public.orders;`).

## 5. Go live
Push to GitHub → GitHub Pages serves the updated site. Share the store URL;
keep `/dd-ops-k7f29x.html` for yourself.

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
| `dd-ops-k7f29x.html`, `assets/js/admin.js`, `assets/css/admin.css` | Private admin dashboard |
| `assets/js/db.js` | Shared Supabase client |
| `supabase/schema.sql` | Tables + row-level security + cost seed + realtime |
| `hermes/order-listener.js` | Runs on your server; alerts you on every new order |
| `hermes/README.md` | How to run the listener 24/7 (pm2 / systemd) |
