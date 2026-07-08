// ===== dripdrip — My Orders page =====
(function () {
  'use strict';
  var CFG = window.TIAO_CONFIG || {};
  var REST = (CFG.SUPABASE_URL || '') + '/rest/v1/';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function money(n) { return '£' + Number(n || 0).toLocaleString('en-GB'); }
  function el(id) { return document.getElementById(id); }

  var STATUS = {
    pending:  { label: 'Pending review', cls: 'warning', note: 'We’re verifying availability — we’ll be in touch shortly.' },
    accepted: { label: 'Accepted',       cls: 'good',    note: 'Confirmed! We’ll follow up with payment & delivery details.' },
    declined: { label: 'Declined',       cls: 'critical',note: 'Sorry, we couldn’t fulfil this one. Contact us for alternatives.' },
    shipped:  { label: 'Shipped',        cls: 'info',    note: 'On its way — see your tracking below.' },
    delivered:{ label: 'Delivered',      cls: 'neutral', note: 'Delivered. Thank you for shopping with dripdrip.' }
  };

  // Visual progress so the customer sees exactly where their order is.
  var FLOW = [
    { key: 'pending',   label: 'Requested' },
    { key: 'accepted',  label: 'Confirmed' },
    { key: 'shipped',   label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' }
  ];
  function stepHTML(status) {
    if (status === 'declined') {
      return '<div class="ostep ostep--declined">✕ This request was declined — nothing was charged. ' +
        'Contact us and we’ll suggest alternatives.</div>';
    }
    var idx = FLOW.map(function (s) { return s.key; }).indexOf(status);
    if (idx < 0) idx = 0;
    var html = '<div class="ostep">';
    FLOW.forEach(function (s, i) {
      if (i) html += '<div class="ostep__line' + (i <= idx ? ' is-done' : '') + '"></div>';
      var cls = i < idx ? 'is-done' : (i === idx ? 'is-current' : '');
      html += '<div class="ostep__step ' + cls + '">' +
        '<span class="ostep__dot">' + (i < idx ? '✓' : (i + 1)) + '</span>' +
        '<span class="ostep__lbl">' + s.label + '</span></div>';
    });
    return html + '</div>';
  }

  function getToken() {
    var auth = window.TiaoAuth;
    return auth.token().then(function (t) { return t; });
  }

  function fetchOrders(token, retry) {
    return fetch(REST + 'orders?select=*&order=created_at.desc', {
      headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token }
    }).then(function (r) {
      if (r.status === 401 && !retry) {
        return window.TiaoAuth.refresh().then(function (nt) { return fetchOrders(nt, true); });
      }
      if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + (t ? ' — ' + t : '')); });
      return r.json();
    });
  }

  // ---- logged-in list: searchable + collapsible so many orders stay tidy ----
  var allOrders = [];
  var flt = { q: '', status: 'all' };
  var FILTER_ORDER = ['all', 'pending', 'accepted', 'shipped', 'delivered', 'declined'];

  function orderRef(o) {
    return o.ref_code ? esc(o.ref_code) : ('#' + esc(String(o.id).slice(0, 8).toUpperCase()));
  }
  function orderMatches(o) {
    if (flt.status !== 'all' && o.status !== flt.status) return false;
    if (flt.q) {
      var names = (Array.isArray(o.items) ? o.items : []).map(function (it) { return it.brand + ' ' + it.name; }).join(' ');
      var hay = ((o.ref_code || '') + ' ' + String(o.id) + ' ' + names).toLowerCase();
      if (hay.indexOf(flt.q) === -1) return false;
    }
    return true;
  }

  function orderCardHTML(o, open) {
    var meta = STATUS[o.status] || STATUS.pending;
    var items = (Array.isArray(o.items) ? o.items : []).map(function (it) {
      return '<div class="co-line"><img src="' + esc(it.img || '') + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="co-line__info"><span class="co-line__brand">' + esc(it.brand) + '</span>' +
        '<span class="co-line__name">' + esc(it.name) + ((it.qty || 1) > 1 ? ' ×' + it.qty : '') + '</span>' +
        (it.size ? '<span class="co-line__size">Size: ' + esc(it.size) + '</span>' : '') + '</div>' +
        '<span class="co-line__price">' + money(it.price * (it.qty || 1)) + '</span></div>';
    }).join('');
    var date = new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return '<details class="ord"' + (open ? ' open' : '') + '>' +
      '<summary class="ord__sum">' +
        '<span class="ord__ref">' + orderRef(o) + '</span>' +
        '<span class="ord__date">' + date + '</span>' +
        '<span class="adm-badge acct-badge acct-badge--' + meta.cls + '">' + esc(meta.label) + '</span>' +
        '<span class="ord__chev" aria-hidden="true">⌄</span>' +
      '</summary>' +
      '<div class="ord__body">' +
        stepHTML(o.status) +
        '<p class="acct-order__note">' + esc(meta.note) + '</p>' +
        '<div class="acct-order__items">' + items +
          '<div class="checkout__total"><span>Estimated total</span><strong>' + money(o.subtotal) + '</strong></div>' +
        '</div>' +
        (o.tracking_url ? '<a class="btn btn--outline acct-track-btn" href="' + esc(o.tracking_url) + '" target="_blank" rel="noopener">TRACK PARCEL →</a>' : '') +
      '</div>' +
    '</details>';
  }

  function paint() {
    var box = el('acctList'); if (!box) return;
    var list = allOrders.filter(orderMatches);
    if (!list.length) {
      box.innerHTML = '<p class="muted-note acct-none">No orders match. <button class="link-inline" id="acctClear">Clear</button></p>';
      var c = el('acctClear'); if (c) c.addEventListener('click', function () { flt = { q: '', status: 'all' }; render(allOrders); });
      return;
    }
    // expand the first result by default (or the only one); rest stay folded
    box.innerHTML = list.map(function (o, i) { return orderCardHTML(o, list.length === 1 || i === 0); }).join('');
  }

  function render(orders) {
    allOrders = orders || [];
    var body = el('acctBody');
    if (!allOrders.length) {
      body.innerHTML = '<div class="acct-empty"><p>You haven’t placed any requests yet.</p>' +
        '<a href="bags.html" class="btn btn--solid">START SHOPPING</a></div>';
      return;
    }
    var counts = { all: allOrders.length };
    FILTER_ORDER.slice(1).forEach(function (s) { counts[s] = allOrders.filter(function (o) { return o.status === s; }).length; });
    var SHORT = { all: 'All', pending: 'Pending', accepted: 'Accepted', shipped: 'Shipped', delivered: 'Delivered', declined: 'Declined' };
    var pills = FILTER_ORDER.filter(function (s) { return s === 'all' || counts[s]; }).map(function (s) {
      return '<button class="acct-fpill' + (flt.status === s ? ' is-active' : '') + '" data-status="' + s + '">' +
        (SHORT[s] || s) + ' <em>' + counts[s] + '</em></button>';
    }).join('');

    body.innerHTML =
      '<div class="acct-controls">' +
        '<input type="search" class="acct-search" id="acctSearch" placeholder="Search reference or item…" autocomplete="off" value="' + esc(flt.q) + '">' +
        '<div class="acct-fpills" id="acctFilters">' + pills + '</div>' +
      '</div>' +
      '<div id="acctList"></div>';

    el('acctSearch').addEventListener('input', function () { flt.q = this.value.trim().toLowerCase(); paint(); });
    el('acctFilters').querySelectorAll('[data-status]').forEach(function (b) {
      b.addEventListener('click', function () {
        flt.status = b.dataset.status;
        el('acctFilters').querySelectorAll('[data-status]').forEach(function (x) { x.classList.toggle('is-active', x === b); });
        paint();
      });
    });
    paint();
  }

  // Read ?ref=&email=&placed=1 (set right after placing an order).
  function params() {
    var p = {}; (location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return; var a = kv.split('='); p[decodeURIComponent(a[0])] = decodeURIComponent((a[1] || '').replace(/\+/g, ' '));
    }); return p;
  }

  // Just-placed order (or any ?ref=&email= deep link): load and show it directly,
  // whether or not the shopper is signed in. Shows the exact DRIP reference.
  function trackByRef(ref, email, justPlaced, tries) {
    var body = el('acctBody');
    if (justPlaced) if (el('acctWho')) el('acctWho').textContent = '';
    fetch(REST + 'rpc/track_order', {
      method: 'POST',
      headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_ref: ref, p_email: email })
    }).then(function (r) { return r.json(); }).then(function (rows) {
      if ((!Array.isArray(rows) || !rows.length) && (tries || 0) < 3) {
        // the row may not be queryable for a beat right after insert — retry
        return setTimeout(function () { trackByRef(ref, email, justPlaced, (tries || 0) + 1); }, 700);
      }
      var banner = justPlaced
        ? '<div class="acct-placed"><div class="checkout__tick">✓</div>' +
            '<h2>Order request received!</h2>' +
            '<p class="muted-note">We’ve emailed your reference to <strong>' + esc(email) + '</strong>. ' +
            'Save it — you can track your order any time with it.</p>' +
            '<div class="checkout__refblock"><span class="checkout__reflabel">Your reference</span>' +
              '<strong class="checkout__refcode">' + esc(ref) + '</strong></div></div>'
        : '';
      if (!Array.isArray(rows) || !rows.length) {
        body.innerHTML = banner + '<p class="muted-note">We couldn’t load the order details just yet. ' +
          'It can take a moment — refresh in a few seconds, or <a href="account.html">track it here</a> with your reference &amp; email.</p>';
        return;
      }
      body.innerHTML = banner + orderCard(rows[0], ref) +
        '<div style="margin-top:24px"><a href="index.html" class="btn btn--solid">CONTINUE SHOPPING</a></div>';
    }).catch(function () {
      body.innerHTML = '<p class="muted-note">Couldn’t load that order right now. <a href="account.html">Try tracking here</a>.</p>';
    });
  }

  function start() {
    var auth = window.TiaoAuth;
    var body = el('acctBody');
    if (!auth || !auth.isReady()) { body.innerHTML = '<p class="muted-note">Accounts aren’t connected yet.</p>'; return; }

    // Deep-linked / just-placed order takes priority over the normal views.
    var q = params();
    if (q.ref && q.email) { trackByRef(q.ref.toUpperCase(), q.email, q.placed === '1', 0); return; }

    if (!auth.isLoggedIn()) {
      renderGuest(body);
      return;
    }
    var u = auth.getUser();
    if (u && el('acctWho')) el('acctWho').textContent = u.email;
    getToken()
      .then(fetchOrders)
      .then(render)
      .catch(function (err) {
        if (String(err.message).indexOf('not-signed-in') !== -1 || String(err.message).indexOf('refresh') !== -1) {
          auth.signOut();
          body.innerHTML = '<div class="acct-empty"><p>Your session expired. Please sign in again.</p>' +
            '<button class="btn btn--solid" data-open="account">SIGN IN</button></div>';
          return;
        }
        body.innerHTML = '<p class="muted-note">Couldn’t load your orders: ' + esc(err.message) + '</p>';
      });
  }

  // ---- guest tracking (no account) ----
  function renderGuest(body) {
    body.innerHTML =
      '<div class="acct-guest">' +
        '<div class="acct-track">' +
          '<h2>Track your order</h2>' +
          '<p class="muted-note">Enter the reference from your confirmation (looks like <b>DRIP-XXXXXX</b>) and the email you used at checkout.</p>' +
          '<form class="req-form acct-track__form" id="guestForm">' +
            '<label>Reference<input type="text" name="ref" placeholder="DRIP-XXXXXX" required autocapitalize="characters" /></label>' +
            '<label>Email<input type="email" name="email" placeholder="Email used at checkout" required autocomplete="email" /></label>' +
            '<button type="submit" class="btn btn--solid btn--block" id="guestBtn">CHECK STATUS</button>' +
          '</form>' +
          '<div id="guestResult"></div>' +
        '</div>' +
        '<p class="acct-signin">Have a dripdrip account? <button class="link-inline" data-open="account">Sign in</button> to see all your orders in one place.</p>' +
      '</div>';
    document.getElementById('guestForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = document.getElementById('guestBtn'), out = document.getElementById('guestResult');
      btn.disabled = true; btn.textContent = 'CHECKING…'; out.innerHTML = '';
      fetch(REST + 'rpc/track_order', {
        method: 'POST',
        headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_ref: f.ref.value.trim(), p_email: f.email.value.trim() })
      }).then(function (r) { return r.json(); }).then(function (rows) {
        btn.disabled = false; btn.textContent = 'CHECK STATUS';
        if (!Array.isArray(rows) || !rows.length) {
          out.innerHTML = '<p class="muted-note">No order found for that reference &amp; email. Double-check both and try again.</p>';
          return;
        }
        out.innerHTML = orderCard(rows[0], f.ref.value.trim().toUpperCase());
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'CHECK STATUS';
        out.innerHTML = '<p class="muted-note">Couldn’t check right now: ' + esc(err.message) + '</p>';
      });
    });
  }

  function orderCard(o, ref) {
    var meta = STATUS[o.status] || STATUS.pending;
    var items = (Array.isArray(o.items) ? o.items : []).map(function (it) {
      return '<div class="co-line"><div class="co-line__info"><span class="co-line__brand">' + esc(it.brand) + '</span>' +
        '<span class="co-line__name">' + esc(it.name) + ((it.qty || 1) > 1 ? ' ×' + it.qty : '') + '</span>' +
        (it.size ? '<span class="co-line__size">Size: ' + esc(it.size) + '</span>' : '') + '</div>' +
        '<span class="co-line__price">' + money(it.price * (it.qty || 1)) + '</span></div>';
    }).join('');
    var date = new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return '<article class="acct-order" style="margin-top:20px">' +
      '<div class="acct-order__top"><div><span class="acct-order__ref">#' + esc(ref) + '</span>' +
        '<span class="acct-order__date">' + date + '</span></div>' +
        '<span class="adm-badge acct-badge acct-badge--' + meta.cls + '">' + esc(meta.label) + '</span></div>' +
      stepHTML(o.status) +
      '<p class="acct-order__note">' + esc(meta.note) + '</p>' +
      '<div class="acct-order__items">' + items +
        '<div class="checkout__total"><span>Estimated total</span><strong>' + money(o.subtotal) + '</strong></div></div>' +
      (o.tracking_url ? '<a class="btn btn--outline acct-track-btn" href="' + esc(o.tracking_url) + '" target="_blank" rel="noopener">TRACK PARCEL →</a>' : '') +
    '</article>';
  }

  if (window.TiaoAuth) start(); else window.addEventListener('DOMContentLoaded', start);
})();
