# tiao — hermes order listener

Runs on your always-on server (**hermes**) and alerts you the instant a new order
request lands in Supabase. No open ports required — it connects **outbound** to
Supabase Realtime, so it works behind NAT/firewalls.

## Requirements
- Node.js 18+ on hermes  (`node -v` to check)
- Your Supabase project URL + **service role** key

## Install & run
```bash
# copy the hermes/ folder onto your server, then:
cd hermes
cp .env.example .env      # fill in SUPABASE_* and ONE alert channel
npm install
npm start                 # you should see: [realtime] SUBSCRIBED
```
Place a test order on the site → the alert fires within a second.

## Keep it running 24/7

**Option A — pm2 (simplest):**
```bash
npm i -g pm2
pm2 start order-listener.js --name tiao-orders
pm2 save && pm2 startup      # relaunch on reboot
pm2 logs tiao-orders         # watch orders live
```

**Option B — systemd:**
```ini
# /etc/systemd/system/tiao-orders.service
[Unit]
Description=tiao order listener
After=network-online.target

[Service]
WorkingDirectory=/path/to/hermes
EnvironmentFile=/path/to/hermes/.env
ExecStart=/usr/bin/node order-listener.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now tiao-orders
journalctl -u tiao-orders -f
```

## Alert channels
Set **one** (or several) in `.env`:

| Channel | Env var(s) | Notes |
|---|---|---|
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Bot via @BotFather; chat id via @userinfobot |
| Discord | `DISCORD_WEBHOOK_URL` | Server → Integrations → Webhooks |
| ntfy / push | `NTFY_URL` | e.g. `https://ntfy.sh/your-topic` (self-hostable) |
| Generic webhook | `ALERT_WEBHOOK_URL` | POSTs `{text, order}` to any endpoint hermes exposes |
| Shell command | `ALERT_COMMAND` | Runs a command; message on stdin + `$ORDER_TEXT` |

It always logs each order to stdout, so pm2/journalctl already give you a live feed.

## Why the service role key?
Orders are readable only by admins (row-level security). The service role key runs
server-side on hermes and bypasses RLS so the listener can see new orders. Keep it
in `.env` on hermes only — never in the website or git.
