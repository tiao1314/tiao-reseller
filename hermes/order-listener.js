/* =====================================================================
 *  tiao — hermes order listener
 *  Runs on your always-on server. Subscribes to Supabase Realtime and
 *  alerts you the moment a new order request lands. Outbound-only — no
 *  open ports, works behind NAT/firewalls.
 *
 *  Alerts go to whichever channel(s) you configure via env vars:
 *    - Telegram        (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
 *    - Discord         (DISCORD_WEBHOOK_URL)
 *    - ntfy / push     (NTFY_URL)
 *    - Generic webhook (ALERT_WEBHOOK_URL)  ← point this at hermes' own alert endpoint
 *    - Shell command   (ALERT_COMMAND)      ← run any command hermes already uses
 *  It always logs to stdout too, so `journalctl`/pm2 logs capture every order.
 *
 *  Requires Node 18+ (built-in fetch).  See README.md.
 * ===================================================================== */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
  DISCORD_WEBHOOK_URL,
  NTFY_URL,
  ALERT_WEBHOOK_URL,
  ALERT_COMMAND,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example → .env and fill it in.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/* ---------- message formatting ---------- */
function formatOrder(o) {
  const items = Array.isArray(o.items) ? o.items : [];
  const itemLine = items.length
    ? items.map((i) => `• ${i.brand} ${i.name} — £${i.price}`).join('\n')
    : '• (no items)';
  const contact = o.customer_phone || o.customer_email || '—';
  const ref = o.id ? String(o.id).slice(0, 8).toUpperCase() : '';
  return (
    `🛍️ NEW tiao ORDER REQUEST\n` +
    `Customer: ${o.customer_name || 'Unknown'}\n` +
    `Contact:  ${contact}\n` +
    `Total:    £${o.subtotal ?? 0}\n` +
    (o.note ? `Note:     ${o.note}\n` : '') +
    `Items:\n${itemLine}\n` +
    (ref ? `Ref:      #${ref}\n` : '') +
    `Review it in your admin panel.`
  );
}

/* ---------- alert adapters (each fires only if configured) ---------- */
async function sendAlert(text, order) {
  console.log('\n' + text + '\n');           // always logged

  const jobs = [];

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    jobs.push(
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
      }).then((r) => log('telegram', r.status))
    );
  }

  if (DISCORD_WEBHOOK_URL) {
    jobs.push(
      fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '```\n' + text + '\n```' }),
      }).then((r) => log('discord', r.status))
    );
  }

  if (NTFY_URL) {
    jobs.push(
      fetch(NTFY_URL, {
        method: 'POST',
        headers: { Title: 'New tiao order', Priority: 'high', Tags: 'shopping_bags' },
        body: text,
      }).then((r) => log('ntfy', r.status))
    );
  }

  if (ALERT_WEBHOOK_URL) {
    jobs.push(
      fetch(ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, order }),
      }).then((r) => log('webhook', r.status))
    );
  }

  if (ALERT_COMMAND) {
    jobs.push(new Promise((res) => {
      const child = exec(ALERT_COMMAND, { env: { ...process.env, ORDER_TEXT: text } }, (err) => {
        log('command', err ? 'error: ' + err.message : 'ok');
        res();
      });
      child.stdin.end(text);
    }));
  }

  await Promise.allSettled(jobs);
}

function log(name, status) { console.log(`  → ${name}: ${status}`); }

/* ---------- realtime subscription ---------- */
function subscribe() {
  const channel = supabase
    .channel('tiao-orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
      const order = payload.new;
      sendAlert(formatOrder(order), order).catch((e) => console.error('alert error:', e.message));
    })
    .subscribe((status) => {
      console.log('[realtime]', status, new Date().toISOString());
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.log('reconnecting in 5s…');
        setTimeout(() => { supabase.removeChannel(channel); subscribe(); }, 5000);
      }
    });
}

console.log('tiao hermes listener starting…');
console.log('watching public.orders for new requests. Ctrl-C to stop.\n');
subscribe();

process.on('SIGINT', () => { console.log('\nstopping.'); process.exit(0); });
