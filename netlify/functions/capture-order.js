// ===== tiao — capture a PayPal payment, then notify WhatsApp group =====
// Runs only after PayPal approval. On a SUCCESSFUL capture it sends a
// WhatsApp message to your group via CallMeBot. The notification therefore
// only ever fires for a real, verified payment.
const catalog = require('./catalog.json');

const PP_BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const auth = Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_SECRET).toString('base64');
  const res = await fetch(PP_BASE + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('PayPal auth failed: ' + res.status);
  return (await res.json()).access_token;
}

// Send a WhatsApp message to your group via CallMeBot.
// Setup (once): add CallMeBot's number to your WhatsApp group and follow
// https://www.callmebot.com/blog/free-api-whatsapp-messages/ to get your
// group's apikey. Then set CALLMEBOT_PHONE and CALLMEBOT_APIKEY in Netlify.
async function notifyWhatsApp(text) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) { console.log('CallMeBot not configured — skipping notify'); return; }
  const url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(phone) +
    '&text=' + encodeURIComponent(text) + '&apikey=' + encodeURIComponent(apikey);
  try {
    const res = await fetch(url);
    console.log('CallMeBot status', res.status);
  } catch (e) {
    console.log('CallMeBot error', e.message);   // never fail the order over a notification
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { orderID, items } = JSON.parse(event.body || '{}');
    if (!orderID) return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderID' }) };

    const token = await getAccessToken();
    const res = await fetch(PP_BASE + '/v2/checkout/orders/' + orderID + '/capture', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok || data.status !== 'COMPLETED') {
      return { statusCode: 502, body: JSON.stringify({ error: 'Capture failed', detail: data }) };
    }

    // Pull verified details straight from PayPal's response.
    const cap = data.purchase_units[0].payments.captures[0];
    const amount = cap.amount.value;
    const currency = cap.amount.currency_code;
    const payer = data.payer && data.payer.name
      ? [data.payer.name.given_name, data.payer.name.surname].filter(Boolean).join(' ')
      : 'a customer';
    const itemNames = (Array.isArray(items) ? items : [])
      .map(id => (catalog[id] ? catalog[id].brand + ' ' + catalog[id].name : id));
    const itemLine = itemNames.length ? itemNames.join(', ') : 'our products';

    const msg =
      '🛍️ *New tiao order!*\n' +
      'Thanks ' + payer + ' for purchasing ' + itemLine + '.\n' +
      'Total: ' + currency + ' ' + amount + '\n' +
      'Order: ' + data.id;
    await notifyWhatsApp(msg);

    return { statusCode: 200, body: JSON.stringify({ status: 'COMPLETED', orderID: data.id, payer, amount, currency }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
