// ===== tiao — create a PayPal order (server-side, tamper-proof total) =====
// The browser sends only product IDs. We look up prices from catalog.json here,
// so a customer can never change what they're charged.
const catalog = require('./catalog.json');

const PP_BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';
const CURRENCY = process.env.PAYPAL_CURRENCY || 'GBP';

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { items } = JSON.parse(event.body || '{}');       // items = ['b2','s1',...]
    if (!Array.isArray(items) || !items.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty.' }) };
    }

    // Compute total from the trusted server-side catalogue.
    let total = 0;
    const lines = [];
    for (const id of items) {
      const p = catalog[id];
      if (!p) return { statusCode: 400, body: JSON.stringify({ error: 'Unknown item: ' + id }) };
      total += p.price;
      lines.push(p.brand + ' — ' + p.name);
    }

    const token = await getAccessToken();
    const res = await fetch(PP_BASE + '/v2/checkout/orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: CURRENCY, value: total.toFixed(2) },
          description: ('tiao order — ' + lines.join(', ')).slice(0, 127)
        }]
      })
    });
    const order = await res.json();
    if (!res.ok) return { statusCode: 502, body: JSON.stringify({ error: 'Could not create order', detail: order }) };

    return { statusCode: 200, body: JSON.stringify({ id: order.id }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
