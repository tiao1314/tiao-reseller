// ===== tiao — admin panel (orders + dashboard) =====
(function () {
  'use strict';

  var CFG = window.TIAO_CONFIG || {};
  var REST = (CFG.SUPABASE_URL || '') + '/rest/v1/';
  var AUTH = (CFG.SUPABASE_URL || '') + '/auth/v1/';
  var TKEY = 'tiao_admin_token', RKEY = 'tiao_admin_refresh', EKEY = 'tiao_admin_email';
  var token = localStorage.getItem(TKEY) || '';
  var userEmail = localStorage.getItem(EKEY) || '';

  // Direct REST helpers (no supabase-js). apikey identifies the project; the
  // Bearer is the admin's session token, resolving to the authenticated role.
  function headers(extra) {
    var h = { 'apikey': CFG.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token };
    if (extra) { for (var k in extra) h[k] = extra[k]; }
    return h;
  }
  function saveSession(d) {
    token = d.access_token;
    if (d.user && d.user.email) userEmail = d.user.email;
    localStorage.setItem(TKEY, token);
    if (d.refresh_token) localStorage.setItem(RKEY, d.refresh_token);
    localStorage.setItem(EKEY, userEmail);
  }
  // Exchange the refresh token for a fresh access token when the old one expires.
  function refreshSession() {
    var rt = localStorage.getItem(RKEY);
    if (!rt) return Promise.reject(new Error('no-refresh'));
    return fetch(AUTH + 'token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.access_token) throw new Error('refresh-failed');
      saveSession(d); return token;
    });
  }
  // Core request with one automatic token-refresh + retry on 401.
  function request(method, path, extraHeaders, body, retried) {
    var opts = { method: method, headers: headers(extraHeaders) };
    if (body != null) opts.body = body;
    return fetch(REST + path, opts).then(function (r) {
      if (r.status === 401 && !retried) {
        return refreshSession()
          .then(function () { return request(method, path, extraHeaders, body, true); })
          .catch(function () { authFail(); throw new Error('Session expired'); });
      }
      return r.text().then(function (t) {
        if (!r.ok) throw new Error('HTTP ' + r.status + (t ? ' — ' + t : ''));
        return t ? JSON.parse(t) : [];
      });
    });
  }
  function apiGet(path) { return request('GET', path); }
  function apiPatch(path, bodyObj) {
    return request('PATCH', path, { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, JSON.stringify(bodyObj));
  }
  function authFail() {
    token = ''; localStorage.removeItem(TKEY); localStorage.removeItem(RKEY);
    showLogin();
    var m = el('loginMsg'); if (m) { m.hidden = false; m.textContent = 'Your session expired — please sign in again.'; }
  }

  var CONFIRMED = ['accepted', 'shipped', 'delivered']; // count toward revenue/profit
  var STATUSES = ['pending', 'accepted', 'declined', 'shipped', 'delivered'];
  var STATUS_META = {
    pending:  { label: 'Pending',  cls: 'warning',  icon: '●' },
    accepted: { label: 'Accepted', cls: 'good',     icon: '✓' },
    declined: { label: 'Declined', cls: 'critical', icon: '✕' },
    shipped:  { label: 'Shipped',  cls: 'info',     icon: '➤' },
    delivered:{ label: 'Delivered',cls: 'neutral',  icon: '✓✓' }
  };

  var el = function (id) { return document.getElementById(id); };
  function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  var state = { orders: [], costs: {}, filter: 'all' };

  /* ---------------- boot ---------------- */
  function boot() {
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) { el('notConfigured').hidden = false; return; }
    wireAuth();
    if (token) showApp(); else showLogin();
  }

  function showLogin() { el('loginGate').hidden = false; el('app').hidden = true; }
  function signedOut() {
    token = ''; userEmail = '';
    localStorage.removeItem(TKEY); localStorage.removeItem(EKEY);
    showLogin();
  }
  function showApp() {
    el('loginGate').hidden = true; el('app').hidden = false;
    el('admUser').textContent = userEmail;
    loadData();
  }

  function wireAuth() {
    el('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = el('loginBtn'), msg = el('loginMsg');
      btn.disabled = true; btn.textContent = 'SIGNING IN…'; msg.hidden = true;
      fetch(AUTH + 'token?grant_type=password', {
        method: 'POST',
        headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: f.email.value.trim(), password: f.password.value })
      }).then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, d: d }; });
      }).then(function (res) {
        btn.disabled = false; btn.textContent = 'SIGN IN';
        if (!res.ok || !res.d.access_token) {
          msg.hidden = false;
          msg.textContent = (res.d && (res.d.msg || res.d.error_description || res.d.error)) || 'Invalid login credentials';
          return;
        }
        userEmail = (res.d.user && res.d.user.email) || f.email.value.trim();
        saveSession(res.d);
        showApp();
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'SIGN IN';
        msg.hidden = false; msg.textContent = 'Network error — please try again.';
      });
    });
    el('signoutBtn').addEventListener('click', signedOut);
    el('refreshBtn').addEventListener('click', loadData);
  }

  /* ---------------- data ---------------- */
  function loadData() {
    Promise.all([
      apiGet('orders?select=*&order=created_at.desc'),
      apiGet('product_costs?select=product_id,cost')
    ]).then(function (r) {
      state.orders = Array.isArray(r[0]) ? r[0] : [];
      state.costs = {};
      (Array.isArray(r[1]) ? r[1] : []).forEach(function (c) { state.costs[c.product_id] = Number(c.cost) || 0; });
      renderAll();
    }).catch(function (err) {
      console.error(err);
      // Surface the real error on the dashboard instead of silently failing.
      el('tiles').innerHTML = '<div class="adm-tile adm-tile--warn" style="grid-column:1/-1">' +
        '<span class="adm-tile__label">Couldn’t load orders</span>' +
        '<span class="adm-tile__value" style="font-size:14px;line-height:1.4">' + esc(String(err.message)) + '</span>' +
        '<span class="adm-tile__sub">Screenshot this and send it to me.</span></div>';
    });
  }

  function orderProfit(o) {
    var items = Array.isArray(o.items) ? o.items : [];
    return items.reduce(function (s, it) {
      var cost = state.costs[it.id] != null ? state.costs[it.id] : 0;
      return s + (Number(it.price) - cost);
    }, 0);
  }

  /* ---------------- render ---------------- */
  function renderAll() { renderTiles(); renderChart(); renderFilters(); renderTable(); }

  function renderTiles() {
    var confirmed = state.orders.filter(function (o) { return CONFIRMED.indexOf(o.status) !== -1; });
    var revenue = confirmed.reduce(function (s, o) { return s + Number(o.subtotal || 0); }, 0);
    var profit = confirmed.reduce(function (s, o) { return s + orderProfit(o); }, 0);
    var pending = state.orders.filter(function (o) { return o.status === 'pending'; }).length;
    var aov = confirmed.length ? revenue / confirmed.length : 0;
    var margin = revenue ? (profit / revenue * 100) : 0;

    var tiles = [
      { label: 'Revenue', value: money(revenue), sub: confirmed.length + ' confirmed orders' },
      { label: 'Profit', value: money(profit), sub: margin.toFixed(0) + '% margin', accent: 'profit' },
      { label: 'Avg order value', value: money(aov), sub: 'per confirmed order' },
      { label: 'Needs review', value: String(pending), sub: 'pending requests', accent: pending ? 'warn' : '' }
    ];
    el('tiles').innerHTML = tiles.map(function (t) {
      return '<div class="adm-tile' + (t.accent ? ' adm-tile--' + t.accent : '') + '">' +
        '<span class="adm-tile__label">' + t.label + '</span>' +
        '<span class="adm-tile__value">' + t.value + '</span>' +
        '<span class="adm-tile__sub">' + t.sub + '</span></div>';
    }).join('');
  }

  /* ---- SVG line chart: revenue + profit over time (by day) ---- */
  function renderChart() {
    var host = el('chart');
    var confirmed = state.orders.filter(function (o) { return CONFIRMED.indexOf(o.status) !== -1; });

    // group by day
    var byDay = {};
    confirmed.forEach(function (o) {
      var d = (o.created_at || '').slice(0, 10);
      if (!byDay[d]) byDay[d] = { rev: 0, prof: 0 };
      byDay[d].rev += Number(o.subtotal || 0);
      byDay[d].prof += orderProfit(o);
    });
    var days = Object.keys(byDay).sort();

    el('chartLegend').innerHTML =
      '<span class="adm-key"><i class="adm-swatch adm-swatch--rev"></i>Revenue</span>' +
      '<span class="adm-key"><i class="adm-swatch adm-swatch--prof"></i>Profit</span>';

    if (days.length === 0) {
      host.innerHTML = '<p class="adm-empty">No confirmed orders yet — accept an order to see it here.</p>';
      return;
    }

    var W = Math.max(host.clientWidth || 720, 320), H = 260;
    var m = { t: 16, r: 54, b: 34, l: 56 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var maxV = Math.max.apply(null, days.map(function (d) { return byDay[d].rev; }).concat([1]));
    // round max up to a nice number
    var step = Math.pow(10, Math.floor(Math.log10(maxV)));
    var niceMax = Math.ceil(maxV / step) * step;

    var xAt = function (i) { return days.length === 1 ? m.l + iw / 2 : m.l + (iw * i / (days.length - 1)); };
    var yAt = function (v) { return m.t + ih - (ih * v / niceMax); };

    function path(key) {
      return days.map(function (d, i) { return (i ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + yAt(byDay[d][key]).toFixed(1); }).join(' ');
    }
    function markers(key, cls) {
      return days.map(function (d, i) {
        return '<circle class="adm-dot ' + cls + '" data-i="' + i + '" cx="' + xAt(i).toFixed(1) + '" cy="' + yAt(byDay[d][key]).toFixed(1) + '" r="4.5"/>';
      }).join('');
    }
    // gridlines + y labels (4 steps)
    var grid = '', GY = 4;
    for (var g = 0; g <= GY; g++) {
      var val = niceMax * g / GY, y = yAt(val);
      grid += '<line class="adm-grid" x1="' + m.l + '" y1="' + y.toFixed(1) + '" x2="' + (W - m.r) + '" y2="' + y.toFixed(1) + '"/>' +
        '<text class="adm-axis" x="' + (m.l - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + money(val) + '</text>';
    }
    // x labels (first, middle, last to avoid crowding)
    var xl = '';
    var idxs = days.length <= 4 ? days.map(function (_, i) { return i; }) : [0, Math.floor((days.length - 1) / 2), days.length - 1];
    idxs.forEach(function (i) {
      var lbl = new Date(days[i]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      xl += '<text class="adm-axis" x="' + xAt(i).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + lbl + '</text>';
    });
    // direct labels at last point
    var li = days.length - 1;
    var lastLabels =
      '<text class="adm-dlabel adm-dlabel--rev" x="' + (xAt(li) + 8) + '" y="' + (yAt(byDay[days[li]].rev) + 4) + '">' + money(byDay[days[li]].rev) + '</text>' +
      '<text class="adm-dlabel adm-dlabel--prof" x="' + (xAt(li) + 8) + '" y="' + (yAt(byDay[days[li]].prof) + 4) + '">' + money(byDay[days[li]].prof) + '</text>';

    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="adm-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Revenue and profit over time">' +
        grid +
        '<path class="adm-line adm-line--rev" d="' + path('rev') + '"/>' +
        '<path class="adm-line adm-line--prof" d="' + path('prof') + '"/>' +
        markers('rev', 'adm-dot--rev') + markers('prof', 'adm-dot--prof') +
        lastLabels +
        '<rect id="admHit" x="' + m.l + '" y="' + m.t + '" width="' + iw + '" height="' + ih + '" fill="transparent"/>' +
        '<g id="admCross" style="display:none"><line class="adm-cross" y1="' + m.t + '" y2="' + (m.t + ih) + '"/></g>' +
      '</svg>' +
      '<div id="admTip" class="adm-tip" hidden></div>';

    wireChartHover(host, days, byDay, xAt);
  }

  function wireChartHover(host, days, byDay, xAt) {
    var svg = host.querySelector('svg'), cross = host.querySelector('#admCross'),
        crossLine = cross.querySelector('line'), tip = host.querySelector('#admTip');
    var hit = host.querySelector('#admHit');
    function nearest(px) {
      var best = 0, bd = Infinity;
      for (var i = 0; i < days.length; i++) { var d = Math.abs(xAt(i) - px); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    hit.addEventListener('mousemove', function (e) {
      var r = svg.getBoundingClientRect();
      var px = (e.clientX - r.left) * (svg.viewBox.baseVal.width / r.width);
      var i = nearest(px), d = days[i];
      cross.style.display = ''; crossLine.setAttribute('x1', xAt(i)); crossLine.setAttribute('x2', xAt(i));
      tip.hidden = false;
      tip.innerHTML = '<strong>' + new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</strong>' +
        '<span><i class="adm-swatch adm-swatch--rev"></i>Revenue ' + money(byDay[d].rev) + '</span>' +
        '<span><i class="adm-swatch adm-swatch--prof"></i>Profit ' + money(byDay[d].prof) + '</span>';
      var left = Math.min((e.clientX - r.left) + 14, r.width - tip.offsetWidth - 8);
      tip.style.left = Math.max(8, left) + 'px'; tip.style.top = '12px';
    });
    hit.addEventListener('mouseleave', function () { cross.style.display = 'none'; tip.hidden = true; });
  }

  /* ---- status filters ---- */
  function renderFilters() {
    var counts = { all: state.orders.length };
    STATUSES.forEach(function (s) { counts[s] = state.orders.filter(function (o) { return o.status === s; }).length; });
    var opts = ['all'].concat(STATUSES);
    el('statusFilters').innerHTML = opts.map(function (s) {
      var label = s === 'all' ? 'All' : STATUS_META[s].label;
      return '<button class="adm-chip' + (state.filter === s ? ' is-active' : '') + '" data-filter="' + s + '">' +
        label + ' <em>' + counts[s] + '</em></button>';
    }).join('');
    el('statusFilters').querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () { state.filter = b.dataset.filter; renderFilters(); renderTable(); });
    });
  }

  /* ---- orders table ---- */
  function renderTable() {
    var rows = state.filter === 'all' ? state.orders : state.orders.filter(function (o) { return o.status === state.filter; });
    var body = el('ordersBody');
    el('ordersEmpty').hidden = rows.length > 0;
    body.innerHTML = rows.map(function (o) {
      var items = Array.isArray(o.items) ? o.items : [];
      var itemHtml = items.map(function (it) { return '<div class="adm-item"><b>' + esc(it.brand) + '</b> ' + esc(it.name) + '</div>'; }).join('');
      var meta = STATUS_META[o.status] || STATUS_META.pending;
      var ref = '#' + String(o.id).slice(0, 8).toUpperCase();
      var date = new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      var statusSel = '<select class="adm-select" data-id="' + o.id + '" data-field="status">' +
        STATUSES.map(function (s) { return '<option value="' + s + '"' + (s === o.status ? ' selected' : '') + '>' + STATUS_META[s].label + '</option>'; }).join('') + '</select>';
      var track = '<input class="adm-track" data-id="' + o.id + '" data-field="tracking_url" placeholder="Tracking link" value="' + esc(o.tracking_url) + '" />';
      return '<tr>' +
        '<td class="adm-nowrap"><div>' + date + '</div><span class="adm-ref">' + ref + '</span></td>' +
        '<td><div class="adm-cust">' + esc(o.customer_name) + '</div>' +
          '<div class="adm-muted adm-sm">' + esc(o.customer_email) + '</div>' +
          (o.customer_phone ? '<div class="adm-muted adm-sm">' + esc(o.customer_phone) + '</div>' : '') +
          (o.note ? '<div class="adm-note">“' + esc(o.note) + '”</div>' : '') + '</td>' +
        '<td class="adm-items">' + itemHtml + '</td>' +
        '<td class="num">' + money(o.subtotal) + '</td>' +
        '<td class="num adm-profit">' + money(orderProfit(o)) + '</td>' +
        '<td><span class="adm-badge adm-badge--' + meta.cls + '">' + meta.icon + ' ' + meta.label + '</span>' +
          '<div class="adm-actions">' +
            '<button class="adm-mini adm-mini--ok" data-accept="' + o.id + '">Accept</button>' +
            '<button class="adm-mini adm-mini--no" data-decline="' + o.id + '">Decline</button>' +
          '</div></td>' +
        '<td>' + statusSel + track +
          (o.tracking_url ? '<a class="adm-tracklink" href="' + esc(o.tracking_url) + '" target="_blank" rel="noopener">Open tracking →</a>' : '') +
        '</td>' +
      '</tr>';
    }).join('');
    wireTable();
  }

  function wireTable() {
    var body = el('ordersBody');
    body.querySelectorAll('[data-accept]').forEach(function (b) { b.addEventListener('click', function () { update(b.dataset.accept, { status: 'accepted' }); }); });
    body.querySelectorAll('[data-decline]').forEach(function (b) { b.addEventListener('click', function () { update(b.dataset.decline, { status: 'declined' }); }); });
    body.querySelectorAll('.adm-select').forEach(function (s) { s.addEventListener('change', function () { update(s.dataset.id, { status: s.value }); }); });
    body.querySelectorAll('.adm-track').forEach(function (t) {
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter') { t.blur(); } });
      t.addEventListener('blur', function () { update(t.dataset.id, { tracking_url: t.value.trim() }, true); });
    });
  }

  function update(id, patch, quiet) {
    // optimistic local update
    var o = state.orders.find(function (x) { return String(x.id) === String(id); });
    if (o) Object.assign(o, patch);
    if (!quiet) renderAll(); else { renderTiles(); renderChart(); }
    apiPatch('orders?id=eq.' + encodeURIComponent(id), patch).catch(function (err) { console.error(err); loadData(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
