/* =====================================================================
 *  tiao — WhatsApp sender for the hermes listener (self-hosted, Baileys)
 *  Links to your WhatsApp once via QR (like WhatsApp Web), stores the
 *  session on disk, and sends order alerts to a number or a group.
 *
 *  Unofficial library — great for low-volume personal alerts. Session
 *  files live in the auth dir (git-ignored); never commit them.
 * ===================================================================== */
'use strict';

const P = require('pino');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');

let sock = null;
let ready = false;

async function init(authDir) {
  authDir = authDir || 'wa-auth';
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({ version, auth: state, logger: P({ level: 'silent' }) });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      console.log('\n[whatsapp] Scan this QR: phone → WhatsApp → Settings → Linked devices → Link a device\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') { ready = true; console.log('[whatsapp] connected ✓'); }
    if (connection === 'close') {
      ready = false;
      const code = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output
        ? lastDisconnect.error.output.statusCode : null;
      if (code === DisconnectReason.loggedOut) {
        console.log('[whatsapp] logged out — delete the ' + authDir + ' folder and restart to relink.');
      } else {
        console.log('[whatsapp] connection closed, reconnecting…');
        setTimeout(() => init(authDir), 3000);
      }
    }
  });

  return sock;
}

// Accepts a phone number (any format) or a full JID (group ...@g.us).
function toJid(to) {
  if (!to) return null;
  if (to.includes('@')) return to;                    // already a JID
  const digits = String(to).replace(/[^0-9]/g, '');
  return digits + '@s.whatsapp.net';
}

async function send(to, text) {
  const jid = toJid(to);
  if (!sock || !ready) { console.log('[whatsapp] not ready yet — alert only logged'); return; }
  if (!jid) { console.log('[whatsapp] no WHATSAPP_TO set'); return; }
  await sock.sendMessage(jid, { text });
}

function isReady() { return ready; }

module.exports = { init, send, isReady, _sock: () => sock };
