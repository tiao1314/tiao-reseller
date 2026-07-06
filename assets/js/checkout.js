// ===== tiao — checkout page (PayPal Smart Buttons) =====
(function () {
  'use strict';

  function money(n) { return '£' + n.toLocaleString('en-GB'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function start() {
    var items = Store.getCart();
    var ids = items.map(function (p) { return p.id; });
    var total = Store.cartTotal();

    // Render order summary
    var box = document.getElementById('summaryItems');
    if (!items.length) {
      box.innerHTML = '<p class="checkout__empty">Your cart is empty. <a href="bags.html">Continue shopping →</a></p>';
      document.getElementById('summaryTotal').textContent = money(0);
      return;
    }
    box.innerHTML = items.map(function (p) {
      return '<div class="co-line"><img src="' + p.img + '" alt="' + esc(p.name) + '"><div class="co-line__info">' +
        '<span class="co-line__brand">' + esc(p.brand) + '</span><span class="co-line__name">' + esc(p.name) + '</span></div>' +
        '<span class="co-line__price">' + money(p.price) + '</span></div>';
    }).join('');
    document.getElementById('summaryTotal').textContent = money(total);

    var CFG = window.TIAO_CONFIG || {};
    var msg = document.getElementById('payMsg');

    // No PayPal client id yet → show a friendly setup notice instead of buttons.
    if (!CFG.PAYPAL_CLIENT_ID) {
      msg.hidden = false;
      msg.className = 'checkout__msg checkout__msg--info';
      msg.innerHTML = 'PayPal isn’t connected yet. Add your <strong>PAYPAL_CLIENT_ID</strong> in <code>assets/js/config.js</code> and deploy to Netlify to enable live checkout. See <code>SETUP.md</code>.';
      return;
    }

    // Load the PayPal SDK with the configured client id + currency.
    var s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(CFG.PAYPAL_CLIENT_ID) +
      '&currency=' + encodeURIComponent(CFG.PAYPAL_CURRENCY || 'GBP');
    s.onload = renderButtons;
    s.onerror = function () {
      msg.hidden = false; msg.className = 'checkout__msg checkout__msg--err';
      msg.textContent = 'Could not load PayPal. Check your client id and connection.';
    };
    document.head.appendChild(s);

    function renderButtons() {
      if (!window.paypal) return;
      paypal.Buttons({
        style: { color: 'black', shape: 'rect', label: 'pay', height: 48 },

        // Ask our serverless function to create the order (total computed server-side)
        createOrder: function () {
          return fetch('/.netlify/functions/create-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: ids })
          }).then(function (r) { return r.json(); }).then(function (d) {
            if (!d.id) throw new Error(d.error || 'Could not start payment');
            return d.id;
          });
        },

        // Capture on our server; that's what fires the WhatsApp notification
        onApprove: function (data) {
          return fetch('/.netlify/functions/capture-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID, items: ids })
          }).then(function (r) { return r.json(); }).then(function (d) {
            if (d.status !== 'COMPLETED') throw new Error(d.error || 'Payment not completed');
            // success: clear cart + show confirmation
            ids.forEach(function () { Store.removeFromCart(0); });
            document.querySelector('.checkout__grid').innerHTML =
              '<div class="checkout__done"><div class="checkout__tick">✓</div>' +
              '<h2>Thank you' + (d.payer ? ', ' + esc(d.payer) : '') + '!</h2>' +
              '<p>Your order is confirmed. A receipt is on its way and your piece will be dispatched after final authentication.</p>' +
              '<p class="checkout__ref">Order reference: <strong>' + esc(d.orderID) + '</strong></p>' +
              '<a href="index.html" class="btn btn--solid">CONTINUE SHOPPING</a></div>';
          }).catch(function (err) {
            msg.hidden = false; msg.className = 'checkout__msg checkout__msg--err';
            msg.textContent = err.message || 'Payment failed. No charge was made.';
          });
        },

        onError: function () {
          msg.hidden = false; msg.className = 'checkout__msg checkout__msg--err';
          msg.textContent = 'Something went wrong with PayPal. Please try again.';
        }
      }).render('#paypal-buttons');
    }
  }

  if (window.Store) start(); else window.addEventListener('DOMContentLoaded', start);
})();
