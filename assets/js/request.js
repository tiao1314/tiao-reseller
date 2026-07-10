// ===== dripdrip — order request page =====
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
      box.innerHTML = '<p class="checkout__empty">Your cart is empty. <a href="bags">Continue shopping →</a></p>';
      document.getElementById('summaryTotal').textContent = money(0);
      form.style.display = 'none';
      return;
    }
    box.innerHTML = items.map(function (p) {
      return '<div class="co-line"><img src="' + p.img + '" alt="' + esc(p.name) + '"><div class="co-line__info">' +
        '<span class="co-line__brand">' + esc(p.brand) + '</span><span class="co-line__name">' + esc(p.name) +
          (p.qty > 1 ? ' ×' + p.qty : '') + '</span>' +
        (p.chosenSize ? '<span class="co-line__size">Size: ' + esc(p.chosenSize) + '</span>' : '') + '</div>' +
        '<span class="co-line__price">' + money(p.price * p.qty) + '</span></div>';
    }).join('');
    document.getElementById('summaryTotal').textContent = money(total);

    // Read fields via form.elements — `form.name` resolves to the form's own
    // name property, not the <input name="name">, so it must not be used.
    var F = form.elements;
    function fval(n) { return F[n] ? F[n].value.trim() : ''; }

    // If the DB doesn't have the address columns yet (order_address.sql not run),
    // fold the address into the note and drop the columns so the order still saves.
    function foldAddressToNote(o) {
      var addr = [o.address_line1, o.address_line2, o.city, o.postcode, o.country].filter(Boolean).join(', ');
      var copy = {}, drop = { address_line1: 1, address_line2: 1, city: 1, postcode: 1, country: 1 };
      for (var k in o) { if (!drop[k]) copy[k] = o[k]; }
      copy.note = (o.note ? o.note + ' — ' : '') + (addr ? 'Deliver to: ' + addr : '');
      return copy;
    }

    // Pre-fill from signed-in user if available
    var user = Store.getUser && Store.getUser();
    if (user) {
      if (user.name && F.name) F.name.value = user.name;
      if (user.email && F.email) F.email.value = user.email;
    }

    // Validate the form ourselves so we can show one clear message + highlight
    // the first missing field (all delivery details are required).
    var REQUIRED = [
      { n: 'name', label: 'your full name' },
      { n: 'email', label: 'your email' },
      { n: 'phone', label: 'a phone number' },
      { n: 'address1', label: 'address line 1' },
      { n: 'city', label: 'your town / city' },
      { n: 'postcode', label: 'your postcode' },
      { n: 'country', label: 'your country' }
    ];
    function validate() {
      form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
      for (var i = 0; i < REQUIRED.length; i++) {
        var f = F[REQUIRED[i].n];
        if (!f || !f.value.trim()) { flag(f); return 'Please enter ' + REQUIRED[i].label + '.'; }
      }
      var email = fval('email');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { flag(F.email); return 'Please enter a valid email address.'; }
      return null;
    }
    function flag(f) { if (f) { f.classList.add('is-invalid'); try { f.focus(); if (f.scrollIntoView) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} } }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('reqSubmit');
      var problem = validate();
      if (problem) { showMsg('err', problem); return; }
      var refCode = 'DRIP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      var order = {
        customer_name: fval('name'),
        customer_email: fval('email'),
        customer_phone: fval('phone'),
        note: fval('note'),
        address_line1: fval('address1'),
        address_line2: fval('address2'),
        city: fval('city'),
        postcode: fval('postcode'),
        country: fval('country'),
        items: items.map(function (p) { return { id: p.id, brand: p.brand, name: p.name, price: p.price, img: p.img, size: p.chosenSize || '', qty: p.qty || 1 }; }),
        subtotal: total,
        status: 'pending',
        ref_code: refCode
      };

      var CFG = window.TIAO_CONFIG || {};
      // Graceful path when Supabase isn't configured yet.
      if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) {
        showMsg('info', 'Order captured locally (demo). Connect Supabase to send real order requests — see SUPABASE_SETUP.md.');
        Store.clearCart();
        finish(order);
        return;
      }

      btn.disabled = true; btn.textContent = 'SENDING…';

      // Direct REST insert. NEVER send "Prefer: return=representation" — that
      // makes Supabase read the row back after insert, which guests can't do
      // (they insert but can't read), causing a 401. If the shopper is signed
      // in we attach their Bearer token so a DB trigger links the order to their
      // account; if that token is stale we refresh once, else fall back to guest.
      function doPost(bearer) {
        var h = { 'apikey': CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
        if (bearer) h['Authorization'] = 'Bearer ' + bearer;
        return fetch(CFG.SUPABASE_URL + '/rest/v1/orders', { method: 'POST', headers: h, body: JSON.stringify(order) });
      }

      var auth = window.TiaoAuth;
      var bearerP = (auth && auth.isLoggedIn()) ? auth.token().catch(function () { return null; }) : Promise.resolve(null);

      bearerP.then(function (bearer) {
        var triedRefresh = false, addressStripped = false;
        function attempt(n) {
          return doPost(bearer).then(function (res) {
            if (res.ok) { Store.clearCart(); redirectToTracking(order); return; }
            // Address columns not migrated yet → strip them into the note and retry.
            if (res.status === 400 && !addressStripped) {
              return res.text().then(function (t) {
                if (/address_line1|address_line2|postcode|schema cache|does not exist|PGRST204/i.test(t)) {
                  addressStripped = true; order = foldAddressToNote(order); return attempt(n);
                }
                throw new Error((function () { try { return JSON.parse(t).message; } catch (e) { return 'HTTP 400'; } })());
              });
            }
            if (res.status === 401 && bearer && !triedRefresh) {
              triedRefresh = true;
              return auth.refresh().then(function (nt) { bearer = nt; }, function () { bearer = null; }).then(function () { return attempt(n); });
            }
            if (res.status === 401 && bearer) { bearer = null; return attempt(n); }   // last resort: guest order
            if (n < 4) return new Promise(function (r) { setTimeout(r, 600 * n); }).then(function () { return attempt(n + 1); });
            return res.json().catch(function () { return null; }).then(function (data) {
              throw new Error((data && data.message) || ('HTTP ' + res.status));
            });
          });
        }
        return attempt(1);
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'SEND ORDER REQUEST';
        showMsg('err', 'Could not send: ' + (err.message || 'please try again.'));
      });
    });

    // Real orders: send them straight to the tracking page for this order,
    // carrying the reference + email so it loads immediately.
    function redirectToTracking(order) {
      var q = 'ref=' + encodeURIComponent(order.ref_code) +
              '&email=' + encodeURIComponent(order.customer_email) + '&placed=1';
      window.location.href = 'account?' + q;
    }

    // Demo fallback (no Supabase): show an inline confirmation recap.
    function finish(order) {
      var recap = order.items.map(function (it) {
        return '<div class="co-line"><div class="co-line__info"><span class="co-line__brand">' + esc(it.brand) + '</span>' +
          '<span class="co-line__name">' + esc(it.name) + ((it.qty || 1) > 1 ? ' ×' + it.qty : '') + '</span>' +
          (it.size ? '<span class="co-line__size">Size: ' + esc(it.size) + '</span>' : '') + '</div>' +
          '<span class="co-line__price">' + money(it.price * (it.qty || 1)) + '</span></div>';
      }).join('');
      var contact = order.customer_phone || order.customer_email;
      document.querySelector('.checkout__grid').innerHTML =
        '<div class="checkout__done">' +
          '<div class="checkout__tick">✓</div>' +
          '<h2>Request received' + (order.customer_name ? ', ' + esc(order.customer_name.split(' ')[0]) : '') + '!</h2>' +
          '<p class="checkout__done-sub">Thanks — your request is in. We’ll reach out at <strong>' + esc(contact) + '</strong> to confirm.</p>' +
          '<div class="checkout__refblock"><span class="checkout__reflabel">Your reference</span>' +
            '<strong class="checkout__refcode">' + esc(order.ref_code) + '</strong>' +
            '<span class="checkout__refhint">Save this — track your order any time at <a href="account">Track My Order</a> using this code &amp; your email.</span></div>' +
          '<div class="checkout__recap">' + recap +
            '<div class="checkout__total"><span>Estimated total</span><strong>' + money(order.subtotal) + '</strong></div>' +
          '</div>' +
          '<div class="checkout__steps">' +
            '<div class="cstep"><span class="cstep__n">1</span><div><strong>We verify & authenticate</strong><em>Usually within 24 hours.</em></div></div>' +
            '<div class="cstep"><span class="cstep__n">2</span><div><strong>We confirm your order</strong><em>With payment & delivery details, by email or WhatsApp.</em></div></div>' +
            '<div class="cstep"><span class="cstep__n">3</span><div><strong>We ship it to you</strong><em>Tracked & insured once payment clears.</em></div></div>' +
          '</div>' +
          '<p class="checkout__fine">Nothing is charged yet. Keep an eye on your inbox &amp; messages — we’ll be in touch shortly.</p>' +
          '<a href="/" class="btn btn--solid">CONTINUE SHOPPING</a>' +
        '</div>';
    }

    function showMsg(kind, text) {
      msg.hidden = false;
      msg.className = 'checkout__msg checkout__msg--' + (kind === 'err' ? 'err' : 'info');
      msg.textContent = text;
    }
  }

  // Wait for the catalogue to load before rendering the summary, otherwise a
  // database product in the cart isn't known yet and the page wrongly shows an
  // empty cart / hides the form.
  function boot() { (window.TIAO_CATALOG_READY || Promise.resolve()).then(start); }
  if (window.Store) boot(); else window.addEventListener('DOMContentLoaded', boot);
})();
