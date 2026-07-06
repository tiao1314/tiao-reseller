/* =====================================================================
 *  tiao — list your WhatsApp groups and their JIDs
 *  Run once (`npm run wa-groups`) to find the JID of the group you want
 *  alerts in, then set WHATSAPP_TO=<that jid> (e.g. 12345-6789@g.us).
 * ===================================================================== */
'use strict';

const P = require('pino');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState(process.env.WA_AUTH_DIR || 'wa-auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'silent' }) });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, qr } = u;
    if (qr) {
      console.log('\nScan this QR: WhatsApp → Linked devices → Link a device\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      const groups = await sock.groupFetchAllParticipating();
      const list = Object.values(groups);
      console.log('\nYour WhatsApp groups:\n');
      if (!list.length) console.log('  (none — you are not in any groups)');
      list.forEach((g) => console.log('  ' + g.subject + '  →  ' + g.id));
      console.log('\nSet WHATSAPP_TO to the JID you want (…@g.us for a group, or just your number).');
      process.exit(0);
    }
  });
})();
