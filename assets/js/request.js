// ===== tiao — order request page =====
(function () {
  'use strict';

  function money(n) { return '£' + n.toLocaleString('en-GB'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function start() {
    var items = Store.getCart();
    var total = Store.cartTotal();
    var box = document.getElementById('summaryItems');
    var form = document.getElementById('requestForm');
    var msg = document.getElementById('reqMsg');

    if (!items.length) {
      box.innerHTML = '<p class="checkout__empty">Your cart is empty. <a href="bags.html">Continue shopping →</a></p>';
      document.getElementById('summaryTotal').textContent = money(0);
      form.style.display = 'none';
      return;
    }
    box.innerHTML = items.map(function (p) {
      return '<div class="co-line"><img src="' + p.img + '" alt="' + esc(p.name) + '"><div class="co-line__info">' +
        '<span class="co-line__brand">' + esc(p.brand) + '</span><span class="co-line__name">' + esc(p.name) + '</span></div>' +
        '<span class="co-line__price">' + money(p.price) + '</span></div>';
    }).join('');
    document.getElementById('summaryTotal').textContent = money(total);

    // Pre-fill from signed-in user if available
    var user = Store.getUser && Store.getUser();
    if (user) {
      if (user.name) form.name.value = user.name;
      if (user.email) form.email.value = user.email;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('reqSubmit');
      var order = {
        customer_name: form.name.value.trim(),
        customer_email: form.email.value.trim(),
        customer_phone: form.phone.value.trim(),
        note: form.note.value.trim(),
        items: items.map(function (p) { return { id: p.id, brand: p.brand, name: p.name, price: p.price }; }),
        subtotal: total,
        status: 'pending'
      };

      // Graceful path when Supabase isn't connected yet.
      if (!window.TIAO_DB_READY) {
        showMsg('info', 'Order captured locally (demo). Connect Supabase to send real order requests — see SUPABASE_SETUP.md.');
        finish(order, null);
        return;
      }

      btn.disabled = true; btn.textContent = 'SENDING…';
      window.TIAO_DB.from('orders').insert(order).select().single()
        .then(function (res) {
          if (res.error) throw res.error;
          finish(order, res.data);
        })
        .catch(function (err) {
          btn.disabled = false; btn.textContent = 'SEND ORDER REQUEST';
          showMsg('err', 'Could not send: ' + (err.message || 'please try again.'));
        });
    });

    function finish(order, saved) {
      // clear cart
      items.forEach(function () { Store.removeFromCart(0); });
      var ref = saved && saved.id ? ('#' + String(saved.id).slice(0, 8).toUpperCase()) : '';
      document.querySelector('.checkout__grid').innerHTML =
        '<div class="checkout__done"><div class="checkout__tick">✓</div>' +
        '<h2>Request received' + (order.customer_name ? ', ' + esc(order.customer_name.split(' ')[0]) : '') + '!</h2>' +
        '<p>Thanks — we’ll verify availability and get back to you shortly with confirmation, payment and delivery details.</p>' +
        (ref ? '<p class="checkout__ref">Your reference: <strong>' + esc(ref) + '</strong></p>' : '') +
        '<a href="index.html" class="btn btn--solid">CONTINUE SHOPPING</a></div>';
    }

    function showMsg(kind, text) {
      msg.hidden = false;
      msg.className = 'checkout__msg checkout__msg--' + (kind === 'err' ? 'err' : 'info');
      msg.textContent = text;
    }
  }

  if (window.Store) start(); else window.addEventListener('DOMContentLoaded', start);
})();
