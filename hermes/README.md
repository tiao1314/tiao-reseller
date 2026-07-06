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
cp .env.example .env      # fill in SUPABASE_* and WHATSAPP_TO
npm install
npm start                 # first run prints a QR — scan it (see below)
```
On the **first run** it prints a QR code. On your phone: **WhatsApp → Settings →
Linked devices → Link a device** → scan it. The session is saved to `wa-auth/`
(git-ignored), so you only do this once. You should then see `[whatsapp] connected ✓`
and `[realtime] SUBSCRIBED`.

Place a test order on the site → you get a WhatsApp message within a second.

### Sending to a WhatsApp group
Set `WHATSAPP_TO` to a group's JID instead of your number. To find it:
```bash
npm run wa-groups        # lists your groups and their …@g.us JIDs
```

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
WhatsApp is the primary channel. You can add others alongside it in `.env`:

| Channel | Env var(s) | Notes |
|---|---|---|
| **WhatsApp** | `WHATSAPP_TO` | Your number (e.g. `447700900123`) or a group JID (`…@g.us`). Self-hosted via Baileys — scan QR once |
| Discord | `DISCORD_WEBHOOK_URL` | Server → Integrations → Webhooks |
| ntfy / push | `NTFY_URL` | e.g. `https://ntfy.sh/your-topic` (self-hostable) |
| Generic webhook | `ALERT_WEBHOOK_URL` | POSTs `{text, order}` to any endpoint hermes exposes |
| Shell command | `ALERT_COMMAND` | Runs a command; message on stdin + `$ORDER_TEXT` |

It always logs each order to stdout, so pm2/journalctl already give you a live feed.

## About the WhatsApp integration
It uses **Baileys**, an unofficial WhatsApp library — the standard way to self-host
WhatsApp sending. Notes:
- **Link once** via QR; the session persists in `wa-auth/` (keep it private, never commit).
- Unofficial, so there's a small ToS/ban risk at high volume — negligible for
  low-volume order alerts, but don't blast marketing through it.
- If it ever logs out, delete `wa-auth/` and re-run to relink.
- Want fully official instead? Swap `whatsapp.js` for Meta's WhatsApp Cloud API
  (messages a number, not a group, and needs a Meta app + message templates).

## Why the service role key?
Orders are readable only by admins (row-level security). The service role key runs
server-side on hermes and bypasses RLS so the listener can see new orders. Keep it
in `.env` on hermes only — never in the website or git.
