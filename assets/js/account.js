// ===== tiao — My Orders page =====
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
    delivered:{ label: 'Delivered',      cls: 'neutral', note: 'Delivered. Thank you for shopping with tiao.' }
  };

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

  function render(orders) {
    var body = el('acctBody');
    if (!orders.length) {
      body.innerHTML = '<div class="acct-empty"><p>You haven’t placed any requests yet.</p>' +
        '<a href="bags.html" class="btn btn--solid">START SHOPPING</a></div>';
      return;
    }
    body.innerHTML = orders.map(function (o) {
      var meta = STATUS[o.status] || STATUS.pending;
      var items = (Array.isArray(o.items) ? o.items : []).map(function (it) {
        return '<div class="co-line"><img src="' + esc(it.img || '') + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
          '<div class="co-line__info"><span class="co-line__brand">' + esc(it.brand) + '</span>' +
          '<span class="co-line__name">' + esc(it.name) + '</span></div>' +
          '<span class="co-line__price">' + money(it.price) + '</span></div>';
      }).join('');
      var date = new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return '<article class="acct-order">' +
        '<div class="acct-order__top">' +
          '<div><span class="acct-order__ref">#' + esc(String(o.id).slice(0, 8).toUpperCase()) + '</span>' +
          '<span class="acct-order__date">' + date + '</span></div>' +
          '<span class="adm-badge acct-badge acct-badge--' + meta.cls + '">' + esc(meta.label) + '</span>' +
        '</div>' +
        '<p class="acct-order__note">' + esc(meta.note) + '</p>' +
        '<div class="acct-order__items">' + items +
          '<div class="checkout__total"><span>Estimated total</span><strong>' + money(o.subtotal) + '</strong></div>' +
        '</div>' +
        (o.tracking_url ? '<a class="btn btn--outline acct-track" href="' + esc(o.tracking_url) + '" target="_blank" rel="noopener">TRACK PARCEL →</a>' : '') +
      '</article>';
    }).join('');
  }

  function start() {
    var auth = window.TiaoAuth;
    var body = el('acctBody');
    if (!auth || !auth.isReady()) { body.innerHTML = '<p class="muted-note">Accounts aren’t connected yet.</p>'; return; }
    if (!auth.isLoggedIn()) {
      body.innerHTML = '<div class="acct-empty"><p>Please sign in to view your orders.</p>' +
        '<button class="btn btn--solid" data-open="account">SIGN IN</button></div>';
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

  if (window.TiaoAuth) start(); else window.addEventListener('DOMContentLoaded', start);
})();
