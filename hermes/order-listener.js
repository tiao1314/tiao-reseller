/* =====================================================================
 *  tiao — hermes order listener
 *  Runs on your always-on server. Subscribes to Supabase Realtime and
 *  alerts you the moment a new order request lands. Outbound-only — no
 *  open ports, works behind NAT/firewalls.
 *
 *  Alerts go to whichever channel(s) you configure via env vars:
 *    - WhatsApp        (WHATSAPP_TO = your number or a group JID)  ← primary
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
  WHATSAPP_TO, WA_AUTH_DIR,
  DISCORD_WEBHOOK_URL,
  NTFY_URL,
  ALERT_WEBHOOK_URL,
  ALERT_COMMAND,
  RESEND_API_KEY, WELCOME_FROM,   // e.g. WELCOME_FROM="dripdrip <hello@dripdrip.store>"
} = process.env;

// Send a subscriber welcome email via Resend (https://resend.com). Free tier is
// plenty. Needs RESEND_API_KEY + WELCOME_FROM (a verified sender) in .env.
function sendWelcomeEmail(email) {
  if (!RESEND_API_KEY || !WELCOME_FROM) { console.log('[email] Resend not configured — skipping welcome to', email); return; }
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#111">' +
      '<h1 style="font-weight:800;letter-spacing:.02em">dripdrip</h1>' +
      '<h2 style="font-weight:800">Thanks for subscribing 🖤</h2>' +
      '<p style="color:#555;line-height:1.6">You’re on the list. You’ll be first to hear about new drops, restocks and private sales — verified luxury bags &amp; shoes, priced to move.</p>' +
      '<p style="color:#555;line-height:1.6">Built same. Made to blend in.</p>' +
      '<p style="margin-top:24px"><a href="https://dripdrip.store" style="background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:700">SHOP NOW</a></p>' +
    '</div>';
  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: WELCOME_FROM, to: email, subject: 'Welcome to dripdrip', html: html }),
  }).then((r) => console.log('[email] welcome ->', email, r.status))
    .catch((e) => console.log('[email] error:', e.message));
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example → .env and fill it in.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// WhatsApp (self-hosted) — links via QR on first run, then sends order alerts.
let whatsapp = null;
if (WHATSAPP_TO) {
  whatsapp = require('./whatsapp');
  whatsapp.init(WA_AUTH_DIR).catch((e) => console.error('[whatsapp] init error:', e.message));
}

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

  if (whatsapp && WHATSAPP_TO) {
    jobs.push(
      whatsapp.send(WHATSAPP_TO, text)
        .then(() => log('whatsapp', whatsapp.isReady() ? 'sent' : 'not-ready'))
        .catch((e) => log('whatsapp', 'error: ' + e.message))
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
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'subscribers' }, (payload) => {
      const email = payload.new && payload.new.email;
      if (email) sendWelcomeEmail(email);
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
console.log('watching public.orders (WhatsApp alerts) and public.subscribers (welcome emails). Ctrl-C to stop.\n');
subscribe();

process.on('SIGINT', () => { console.log('\nstopping.'); process.exit(0); });
